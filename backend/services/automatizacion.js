// backend/services/automatizacion.js
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🕒 SE EJECUTA TODOS LOS DÍAS A LA MEDIANOCHE (00:00) EN HORA CDMX
cron.schedule('0 0 * * *', async () => {
  console.log('=== 🤖 [CRON] INICIANDO TAREAS AUTOMÁTICAS DE MEDIANOCHE ===');
  
  const hoy = new Date();
  const diaActual = hoy.getDate(); 
  
  const mesActual = hoy.toLocaleString('es-MX', { month: 'long' }).toUpperCase();
  const añoActual = hoy.getFullYear();
  const stringMesCorrespondiente = `${mesActual}-${añoActual}`;

  try {
    // -----------------------------------------------------------------
    // TAREA 1: GENERACIÓN DINÁMICA GLOBAL Y DESCUENTO DE SALDO A FAVOR
    // -----------------------------------------------------------------
    console.log(`[CRON] Buscando clientes con día de cobro: ${diaActual}...`);
    
    // Buscamos clientes que cobren hoy y traemos sus servicios activos con sus paquetes
    const clientesDelGrupo = await prisma.cliente.findMany({
      where: { diaCobro: diaActual },
      include: { 
        servicios: { 
          where: { estado: 'ACTIVO' },
          include: { paquete: true }
        }
      }
    });

    for (const cliente of clientesDelGrupo) {
      if (!cliente.servicios || cliente.servicios.length === 0) continue;

      // Evitamos duplicar si el cron se ejecuta dos veces por error
      // Buscamos si el cliente ya tiene una factura global emitida para este mes
      const facturaExiste = await prisma.factura.findFirst({
        where: {
          clienteId: cliente.id,
          mes: stringMesCorrespondiente
        }
      });

      if (!facturaExiste) {
        // Sumamos el precio de todos sus servicios activos contratados (Lógica Global)
        const totalACobrar = cliente.servicios.reduce((sum, s) => sum + (s.paquete?.precio || 0), 0);
        
        if (totalACobrar === 0) continue;

        // --- LÓGICA COHESIVA DE SALDO A FAVOR ---
        let montoFinalFactura = totalACobrar;
        let saldoRestanteCliente = parseFloat(cliente.saldo || 0);
        let facturaPagada = false;

        if (saldoRestanteCliente > 0) {
          if (saldoRestanteCliente >= totalACobrar) {
            saldoRestanteCliente -= totalACobrar;
            montoFinalFactura = 0;
            facturaPagada = true;
          } else {
            montoFinalFactura = totalACobrar - saldoRestanteCliente;
            saldoRestanteCliente = 0;
          }
        }

        // Tolerancia de vencimiento: 4 días corridos
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(hoy.getDate() + 4);

        // Guardamos todo en una sola transacción segura
        await prisma.$transaction([
          prisma.factura.create({
            data: {
              clienteId: cliente.id,
              monto: montoFinalFactura,
              mes: stringMesCorrespondiente,
              pagada: facturaPagada,
              vencimiento: fechaVencimiento
            }
          }),
          prisma.cliente.update({
            where: { id: cliente.id },
            data: { saldo: saldoRestanteCliente }
          })
        ]);

        console.log(`✅ Factura generada para ${cliente.nombre}. Monto final: $${montoFinalFactura}. Saldo restante: $${saldoRestanteCliente}`);
      }
    }

    // -----------------------------------------------------------------
    // TAREA 2: SUSPENSIÓN AUTOMÁTICA DE SERVICIOS POR VENCIMIENTO
    // -----------------------------------------------------------------
    console.log('⚠️ [CRON] Revisando facturas vencidas para aplicar suspensiones...');

    // Buscamos facturas que ya pasaron su fecha de vencimiento y no han sido pagadas
    const facturasVencidas = await prisma.factura.findMany({
      where: {
        pagada: false,
        vencimiento: { lt: hoy }
      },
      include: {
        cliente: {
          include: { servicios: { where: { estado: 'ACTIVO' } } }
        }
      }
    });

    let serviciosSuspendidosContador = 0;

    for (const factura of facturasVencidas) {
      if (factura.cliente?.servicios && factura.cliente.servicios.length > 0) {
        // Obtenemos los IDs de todas las antenas/servicios activos de ese cliente moroso
        const idsA規uspend = factura.cliente.servicios.map(s => s.id);

        await prisma.servicio.updateMany({
          where: { id: { in: idsA規uspend } },
          data: { estado: 'SUSPENDIDO' }
        });

        serviciosSuspendidosContador += idsA規uspend.length;
      }
    }

    console.log(`🚨 [CRON] Proceso de corte terminado. Se suspendieron ${serviciosSuspendidosContador} servicios.`);

  } catch (error) {
    console.error('❌ [CRON ERROR] Falló la automatización diaria:', error);
  }
  
  console.log('=== 🤖 [CRON] FIN DE LAS TAREAS AUTOMÁTICAS ===');
}, {
  scheduled: true,
  timezone: "America/Mexico_City" 
});

module.exports = () => {
  console.log("⏰ Cron Jobs unificados de Citynet inicializados correctamente.");
};