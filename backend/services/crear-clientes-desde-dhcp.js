const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

class CrearClientesDesdedhcpService {

  // Extrae numCliente y nombre del comentario: "17 - Carrera Ambriz Elizabeth"
  _parsearComentario(comentario) {
    const match = comentario?.match(/^(\d+)\s*-\s*(.+)$/);
    if (!match) return null;
    return { numCliente: match[1].trim(), nombre: match[2].trim(), fuente: 'comentario' };
  }

  // Extrae nombre del hostname eliminando el sufijo del modelo de equipo
  // "Elizabeth_Carrera_Ambriz_F130" → "Elizabeth Carrera Ambriz"
  // "CallerosZurita_F130"           → "Calleros Zurita"
  _parsearHostname(hostname) {
    if (!hostname) return null;
    // Eliminar sufijos de modelo: F130, F300, F300-25L, RB, etc.
    const sinModelo = hostname.replace(/[_-][A-Z]{0,2}\d{2,4}(?:-\w+)?$/i, '');
    // Reemplazar guiones bajos y guiones por espacios
    const nombre = sinModelo.replace(/[_-]/g, ' ').trim();
    return nombre.length > 1 ? nombre : null;
  }

  // numCliente temporal basado en los últimos 6 chars de la MAC: "BC:E6:7C:73:ED:CA" → "73EDCA"
  _numClienteTemporal(mac) {
    return 'DHCP-' + mac.replace(/:/g, '').slice(-6).toUpperCase();
  }

  async crearClientes(paqueteIdDefault) {
    console.log('\n🏗️  ===== CREANDO CLIENTES DESDE DHCP =====\n');

    const leases = await prisma.clienteMikrotik.findMany();

    console.log(`📋 ${leases.length} leases a procesar\n`);

    let creados    = 0;
    let temporales = 0; // creados con numCliente DHCP-XXXXXX (sin comentario)
    let vinculados = 0;
    let omitidos   = 0;
    let errores    = 0;
    const problemas = [];

    for (const lease of leases) {
      try {
        // Intentar primero por comentario, luego por hostname
        let parsed = this._parsearComentario(lease.comentario);
        let numCliente, nombre, esTemporal = false;

        if (parsed) {
          ({ numCliente, nombre } = parsed);
        } else {
          // Sin comentario: usar hostname para el nombre y MAC para numCliente temporal
          const nombreHostname = this._parsearHostname(lease.hostname);
          if (!nombreHostname) {
            problemas.push({ mac: lease.macAddress, comentario: lease.comentario || '', razon: 'Sin comentario ni hostname válido' });
            omitidos++;
            continue;
          }
          numCliente = this._numClienteTemporal(lease.macAddress);
          nombre     = nombreHostname;
          esTemporal = true;
        }

        // Buscar Torre por servidor DHCP
        let torreId = null;
        if (lease.servidorDhcp) {
          const zona = lease.servidorDhcp.replace(/^dhcp-/i, '').trim();
          const torre = await prisma.torre.findFirst({
            where: { nombre: { contains: zona, mode: 'insensitive' } }
          });
          torreId = torre?.id || null;
        }

        const paqueteId = paqueteIdDefault;
        if (!paqueteId) {
          problemas.push({ mac: lease.macAddress, comentario: lease.comentario, razon: 'Sin paquete disponible' });
          omitidos++;
          continue;
        }

        // ── CASO A: El cliente ya existe → solo vincular MAC ──────────────────
        const clienteExistente = await prisma.cliente.findUnique({
          where: { numCliente },
          include: { servicios: true }
        });

        if (clienteExistente) {
          const servicio = clienteExistente.servicios.find(s => !s.macAddress) ?? clienteExistente.servicios[0];
          if (servicio) {
            await prisma.servicio.update({
              where: { id: servicio.id },
              data: {
                macAddress:           lease.macAddress,
                direccionIp:          lease.ipActual || servicio.direccionIp,
                torreId:              torreId || servicio.torreId,
                ultimaSincronizacion: new Date()
              }
            });
            await prisma.clienteMikrotik.update({
              where: { macAddress: lease.macAddress },
              data:  { sincronizado: true, clienteId: clienteExistente.id }
            });
            console.log(`🔗 Vinculado existente: #${numCliente} ${nombre} → MAC ${lease.macAddress}`);
            vinculados++;
          } else {
            problemas.push({ mac: lease.macAddress, comentario: lease.comentario, razon: `Cliente #${numCliente} sin servicios` });
            omitidos++;
          }
          continue;
        }

        // ── CASO B: Cliente nuevo → crear Usuario + Cliente + Servicio ────────
        const email    = `cliente${numCliente}@citynet.local`;
        const passHash = await bcrypt.hash(numCliente, 10); // contraseña temporal = numCliente

        // Si ya existe un usuario con ese email, regenerar
        const emailFinal = (await prisma.usuario.findUnique({ where: { email } }))
          ? `c${numCliente}_${Date.now()}@citynet.local`
          : email;

        const usuario = await prisma.usuario.create({
          data: { email: emailFinal, password: passHash, rol: 'CLIENTE' }
        });

        const cliente = await prisma.cliente.create({
          data: {
            nombre,
            numCliente,
            email:    emailFinal,
            usuarioId: usuario.id,
            servicios: {
              create: {
                estado:               'ACTIVO',
                macAddress:           lease.macAddress,
                direccionIp:          lease.ipActual || null,
                torreId,
                paqueteId,
                ultimaSincronizacion: new Date()
              }
            }
          }
        });

        await prisma.clienteMikrotik.update({
          where: { macAddress: lease.macAddress },
          data:  { sincronizado: true, clienteId: cliente.id }
        });

        console.log(`✅ Creado${esTemporal ? ' [TEMPORAL]' : ''}: #${numCliente} ${nombre} | MAC ${lease.macAddress} | Torre ID ${torreId ?? '—'}`);
        if (esTemporal) temporales++; else creados++;

      } catch (err) {
        console.error(`❌ Error con ${lease.macAddress}:`, err.message);
        problemas.push({ mac: lease.macAddress, comentario: lease.comentario, razon: err.message });
        errores++;
      }
    }

    const resumen = { creados, temporales, vinculados, omitidos, errores, total: leases.length, problemas };

    console.log('\n📊 RESUMEN CREACIÓN:');
    console.log(`   Creados (con num):  ${creados}`);
    console.log(`   Creados (temporal): ${temporales}`);
    console.log(`   Vinculados:         ${vinculados}`);
    console.log(`   Omitidos:           ${omitidos}`);
    console.log(`   Errores:            ${errores}`);
    console.log(`   Total:              ${leases.length}\n`);

    return resumen;
  }
}

module.exports = new CrearClientesDesdedhcpService();
