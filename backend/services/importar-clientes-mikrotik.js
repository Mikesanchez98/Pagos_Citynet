const { PrismaClient } = require('@prisma/client');
const mikrotikService = require('./mikrotik');

const prisma = new PrismaClient();

class ImportarClientesMikrotikService {
  async importarClientes() {
    console.log('\n🚀 ===== INICIANDO IMPORTACIÓN DE LEASES DHCP =====\n');

    const leases = await mikrotikService.obtenerLeasesDHCP();

    if (leases.length === 0) {
      console.log('⚠️  No hay leases DHCP en el MikroTik');
      return { importados: 0, actualizados: 0, errores: 0, total: 0 };
    }

    console.log(`📡 Procesando ${leases.length} leases DHCP...\n`);

    let importados  = 0;
    let actualizados = 0;
    let errores     = 0;

    for (const lease of leases) {
      if (!lease.mac) {
        errores++;
        continue;
      }

      try {
        const data = {
          ipActual:     lease.ip          || null,
          hostname:     lease.hostname    || null,
          servidorDhcp: lease.servidor    || null,
          comentario:   lease.comentario  || null,
          estadoLease:  lease.estado      || 'bound',
          routerOrigen: process.env.MIKROTIK_HOST || 'router1',
          deshabilitado: lease.deshabilitado === true
        };

        const existente = await prisma.clienteMikrotik.findUnique({
          where: { macAddress: lease.mac }
        });

        if (existente) {
          await prisma.clienteMikrotik.update({
            where: { macAddress: lease.mac },
            data
          });
          actualizados++;
        } else {
          await prisma.clienteMikrotik.create({
            data: { macAddress: lease.mac, ...data }
          });
          console.log(`✅ Importado: ${lease.mac} | IP: ${lease.ip} | Host: ${lease.hostname || '—'}`);
          importados++;
        }

        // Si este lease tiene un Servicio con la misma MAC, actualizar su IP actual
        if (lease.ip) {
          await prisma.servicio.updateMany({
            where: { macAddress: lease.mac },
            data:  { direccionIp: lease.ip, ultimaSincronizacion: new Date() }
          });
        }
      } catch (error) {
        console.error(`❌ Error procesando ${lease.mac}:`, error.message);
        errores++;
      }
    }

    const resumen = { importados, actualizados, errores, total: leases.length };

    console.log('\n📊 RESUMEN:');
    console.log(`   Nuevos:       ${importados}`);
    console.log(`   Actualizados: ${actualizados}`);
    console.log(`   Errores:      ${errores}`);
    console.log(`   Total:        ${leases.length}\n`);

    return resumen;
  }
}

module.exports = new ImportarClientesMikrotikService();
