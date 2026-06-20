// backend/services/sincronizacion-mikrotik.js
// Sincronización periódica: lee sesiones activas de MikroTik y actualiza
// el estado de cada Servicio (IP, MAC, antena) usando Servicio.mikrotikUser
// como clave de vinculación.

const { PrismaClient } = require('@prisma/client');
const mikrotikService = require('./mikrotik');
const prisma = new PrismaClient();

class SincronizacionMikrotikService {

  async sincronizarServicios() {
    const ahora = new Date();
    console.log(`\n[${ahora.toLocaleTimeString()}] 📡 Sincronización MikroTik iniciando...`);

    try {
      const sesionesActivas = await mikrotikService.obtenerSesionesConDetalle();
      console.log(`[Sync] ${sesionesActivas.length} sesiones activas`);

      let actualizadas = 0;
      let cambiosAntena = 0;
      let sinVincular = 0;

      for (const sesion of sesionesActivas) {
        const resultado = await this.procesarSesion(sesion);
        if (resultado.actualizado)   actualizadas++;
        if (resultado.cambioAntena)  cambiosAntena++;
        if (resultado.sinVincular)   sinVincular++;
      }

      // Marcar como SUSPENDIDO servicios vinculados que ya no tienen sesión activa
      await this.marcarInactivos(sesionesActivas);

      console.log(`✅ Sincronización completada:`);
      console.log(`   Actualizados  : ${actualizadas}`);
      console.log(`   Cambios antena: ${cambiosAntena}`);
      console.log(`   Sin vincular  : ${sinVincular}`);

      return { exito: true, sesiones: sesionesActivas.length, actualizadas, cambiosAntena, sinVincular, timestamp: ahora };
    } catch (error) {
      console.error('❌ Error en sincronización:', error.message);
      throw error;
    }
  }

  async procesarSesion(sesion) {
    try {
      const { usuario, ip, mac } = sesion;

      // Buscar servicio por su usuario MikroTik (vínculo directo)
      const servicio = await prisma.servicio.findFirst({
        where: { mikrotikUser: usuario },
        include: { antena: true, cliente: true }
      });

      if (!servicio) {
        // Sesión activa sin servicio vinculado en el sistema
        return { actualizado: false, cambioAntena: false, sinVincular: true };
      }

      let cambioAntena = false;
      const datosActualizar = { ultimaSincronizacion: new Date() };

      // Actualizar IP si cambió
      if (ip && servicio.direccionIp !== ip) {
        console.log(`[Sync] IP: ${usuario} → ${servicio.direccionIp || 'ninguna'} → ${ip}`);
        datosActualizar.direccionIp = ip;

        // Detectar antena: primero por interfaceName, luego por subred
        const antenaDetectada = sesion.interfaz
          ? await this.identificarAntenaPorInterface(sesion.interfaz) ?? await this.identificarAntena(ip)
          : await this.identificarAntena(ip);

        if (antenaDetectada && servicio.antenaId !== antenaDetectada.id) {
          console.log(`🔄 [Sync] Cambio de antena: ${usuario} | ${servicio.antena?.nombre ?? 'ninguna'} → ${antenaDetectada.nombre}`);

          await prisma.cambioAntena.create({
            data: {
              servicioId:      servicio.id,
              antenaAnteriorId: servicio.antenaId,
              antenaActualId:  antenaDetectada.id,
              ipAnterior:      servicio.direccionIp,
              ipActual:        ip,
              macAddress:      mac || null,
              detectedBy:      'sincronizacion',
              razon:           'Cambio de antena detectado automáticamente'
            }
          });

          datosActualizar.antenaId = antenaDetectada.id;
          datosActualizar.torreId  = antenaDetectada.torreId;
          cambioAntena = true;
        }
      }

      // Actualizar MAC si cambió o no estaba
      if (mac && servicio.macAddress !== mac) {
        datosActualizar.macAddress = mac;
      }

      await prisma.servicio.update({
        where: { id: servicio.id },
        data:  datosActualizar
      });

      return { actualizado: true, cambioAntena, sinVincular: false };
    } catch (error) {
      console.error('[Sync] Error procesando sesión:', error.message);
      return { actualizado: false, cambioAntena: false, sinVincular: false };
    }
  }

  // Servicios vinculados a MikroTik que no están en sesiones activas → SUSPENDIDO
  async marcarInactivos(sesionesActivas) {
    const usuariosActivos = sesionesActivas.map(s => s.usuario);

    try {
      await prisma.servicio.updateMany({
        where: {
          mikrotikUser: { not: null },
          estado: 'ACTIVO',
          NOT: { mikrotikUser: { in: usuariosActivos } }
        },
        data: { ultimaSincronizacion: new Date() }
        // Nota: no cambiamos 'estado' automáticamente para evitar falsas suspensiones
        // por pérdidas momentáneas de sesión. El corte manual desde el panel es deliberado.
      });
    } catch (e) {
      console.error('[Sync] Error marcando inactivos:', e.message);
    }
  }

  async identificarAntenaPorInterface(interfaceName) {
    try {
      return await prisma.antena.findFirst({
        where: { interfaceName, activa: true }
      });
    } catch {
      return null;
    }
  }

  async identificarAntena(ip) {
    try {
      const antenas = await prisma.antena.findMany({ where: { activa: true } });
      for (const antena of antenas) {
        if (antena.subred && this.estaEnSubred(ip, antena.subred)) {
          return antena;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  // Comparación bit a bit correcta para cualquier prefijo (/8 al /32)
  estaEnSubred(ip, subred) {
    try {
      const [red, prefijo] = subred.split('/');
      const bits = parseInt(prefijo);

      const ipToInt = str =>
        str.split('.').reduce((acc, n) => ((acc << 8) | parseInt(n)) >>> 0, 0);

      const mascara = bits === 0
        ? 0
        : (0xFFFFFFFF << (32 - bits)) >>> 0;

      return (ipToInt(ip) & mascara) === (ipToInt(red) & mascara);
    } catch {
      return false;
    }
  }
}

module.exports = new SincronizacionMikrotikService();
