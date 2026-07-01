const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class VincularClientesDHCPService {
  async vincularAutomatico() {
    console.log('\n🔗 ===== INICIO AUTO-VINCULACIÓN DHCP =====\n');

    const leases = await prisma.clienteMikrotik.findMany({
      where: { sincronizado: false, macAddress: { not: null } }
    });

    console.log(`📋 ${leases.length} leases pendientes de vincular\n`);

    let vinculados  = 0;
    let sinCliente  = 0;
    let errores     = 0;
    const problemas = [];

    for (const lease of leases) {
      try {
        // Extraer numCliente del comentario: "17 - Nombre Apellido" → "17"
        const match = lease.comentario?.match(/^(\d+)\s*-/);
        if (!match) {
          problemas.push({ mac: lease.macAddress, razon: 'Sin número de cliente en el comentario', comentario: lease.comentario });
          sinCliente++;
          continue;
        }

        const numCliente = match[1];

        const cliente = await prisma.cliente.findUnique({
          where: { numCliente },
          include: { servicios: { include: { antena: true } } }
        });

        if (!cliente) {
          problemas.push({ mac: lease.macAddress, razon: `No existe cliente #${numCliente}` });
          sinCliente++;
          continue;
        }

        // Servicio sin MAC asignada primero; si todos tienen MAC, usa el primero
        const servicio = cliente.servicios.find(s => !s.macAddress) ?? cliente.servicios[0];

        if (!servicio) {
          problemas.push({ mac: lease.macAddress, razon: `Cliente #${numCliente} no tiene servicios` });
          sinCliente++;
          continue;
        }

        // Buscar Torre por zona del servidor DHCP: "dhcp-VillaItzcali" → Torre "VillaItzcali"
        let torreId = servicio.torreId; // conservar la existente si no se encuentra mejor
        if (lease.servidorDhcp) {
          const zona = lease.servidorDhcp.replace(/^dhcp-/i, '').trim();
          const torre = await prisma.torre.findFirst({
            where: { nombre: { contains: zona, mode: 'insensitive' } }
          });
          if (torre) torreId = torre.id;
        }

        await prisma.servicio.update({
          where: { id: servicio.id },
          data: {
            macAddress:           lease.macAddress,
            direccionIp:          lease.ipActual || servicio.direccionIp,
            torreId,
            ultimaSincronizacion: new Date()
          }
        });

        await prisma.clienteMikrotik.update({
          where: { macAddress: lease.macAddress },
          data:  { sincronizado: true, clienteId: cliente.id }
        });

        console.log(`✅ #${numCliente} ${cliente.nombre} → MAC ${lease.macAddress} | IP ${lease.ipActual} | Torre ID ${torreId ?? '—'}`);
        vinculados++;
      } catch (err) {
        console.error(`❌ Error con ${lease.macAddress}:`, err.message);
        problemas.push({ mac: lease.macAddress, razon: err.message });
        errores++;
      }
    }

    const resumen = { vinculados, sinCliente, errores, total: leases.length, problemas };

    console.log('\n📊 RESUMEN AUTO-VINCULACIÓN:');
    console.log(`   Vinculados:  ${vinculados}`);
    console.log(`   Sin cliente: ${sinCliente}`);
    console.log(`   Errores:     ${errores}`);
    console.log(`   Total:       ${leases.length}\n`);

    return resumen;
  }
}

module.exports = new VincularClientesDHCPService();
