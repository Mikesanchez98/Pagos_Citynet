const { PrismaClient } = require('@prisma/client');
const mikrotikService = require('./mikrotik');
const prisma = new PrismaClient();

class SincronizacionMikrotikService {
  async sincronizarServicios() {
    console.log('[Sincronización] Iniciando...');

    try {
      const sesionesActivas = await mikrotikService.obtenerSesionesActivas();
      
      const servicios = await prisma.servicio.findMany({
        include: {
          cliente: true,
          antena: true
        }
      });

      for (const servicio of servicios) {
        const numCliente = servicio.cliente.numCliente;
        const sesionActiva = sesionesActivas.find(s => s.usuario === numCliente);

        if (!sesionActiva) {
          console.log(`⚠️  ${numCliente} no está conectado`);
          continue;
        }

        await this.detectarCambios(servicio, sesionActiva);
      }

      const ahora = new Date();
      console.log(`✅ Sincronización completada a las ${ahora.toLocaleTimeString()}`);

      return { exito: true, timestamp: ahora };

    } catch (error) {
      console.error('❌ Error sincronizando:', error.message);
      throw error;
    }
  }

  async detectarCambios(servicio, sesionActiva) {
    try {
      const cambios = [];

      if (servicio.direccionIp !== sesionActiva.ip) {
        console.log(
          `[${servicio.cliente.numCliente}] IP cambió de ${servicio.direccionIp} a ${sesionActiva.ip}`
        );
        cambios.push({ tipo: 'ip', anterior: servicio.direccionIp, actual: sesionActiva.ip });
      }

      if (cambios.length > 0) {
        await this.procesarCambios(servicio, sesionActiva, cambios);
      }

      await prisma.servicio.update({
        where: { id: servicio.id },
        data: {
          ultimaSincronizacion: new Date()
        }
      });

    } catch (error) {
      console.error(`Error detectando cambios:`, error.message);
    }
  }

  async procesarCambios(servicio, sesionActiva, cambios) {
    try {
      const antenaActual = await this.identificarAntena(sesionActiva.ip);

      if (!antenaActual) {
        console.warn(`⚠️  No se pudo identificar antena para IP ${sesionActiva.ip}`);
        return;
      }

      if (servicio.antenaId !== antenaActual.id) {
        console.log(
          `🔄 [${servicio.cliente.numCliente}] Cambió de antena: ${servicio.antena?.nombre} → ${antenaActual.nombre}`
        );

        await prisma.cambioAntena.create({
          data: {
            servicioId: servicio.id,
            antenaAnteriorId: servicio.antenaId,
            antenaActualId: antenaActual.id,
            ipAnterior: servicio.direccionIp,
            ipActual: sesionActiva.ip,
            detectedBy: 'sincronizacion'
          }
        });

        await prisma.servicio.update({
          where: { id: servicio.id },
          data: {
            antenaId: antenaActual.id,
            direccionIp: sesionActiva.ip,
            ultimaSincronizacion: new Date()
          }
        });

        console.log(`✅ Servicio ${servicio.cliente.numCliente} actualizado`);
      }

    } catch (error) {
      console.error('Error procesando cambios:', error.message);
    }
  }

  async identificarAntena(ip) {
    try {
      const antenas = await prisma.antena.findMany({
        include: { torre: true }
      });

      for (const antena of antenas) {
        if (!antena.subred) continue;

        if (this.estaEnSubred(ip, antena.subred)) {
          return antena;
        }
      }

      return null;
    } catch (error) {
      console.error('Error identificando antena:', error.message);
      return null;
    }
  }

  estaEnSubred(ip, subred) {
    try {
      const [red, mascara] = subred.split('/');
      const partes = red.split('.').map(Number);
      const partsIP = ip.split('.').map(Number);

      const mascaraBits = parseInt(mascara);
      const bytesRed = Math.ceil(mascaraBits / 8);

      for (let i = 0; i < bytesRed; i++) {
        if (partes[i] !== partsIP[i]) return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new SincronizacionMikrotikService();