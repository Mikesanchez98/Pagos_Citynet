// backend/services/automatizacion.js
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🕒 SE EJECUTA TODOS LOS DÍAS A LA MEDIANOCHE (00:00) EN HORA CDMX
cron.schedule('0 0 * * *', async () => {
  console.log('=== 🤖 [CRON] INICIANDO TAREAS AUTOMÁTICAS DE MEDIANOCHE ===');
  
  const hoy = new Date();
  const diaActual = hoy.getDate();

  // Rango del mes actual: del día 1 al último día — usado para detectar duplicados
  const inicioDeMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioDeMesSiguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);

  try {
    // -----------------------------------------------------------------
    // TAREA 1: GENERACIÓN DINÁMICA GLOBAL Y DESCUENTO DE SALDO A FAVOR
    // -----------------------------------------------------------------
    console.log(`[CRON] Buscando clientes con día de cobro: ${diaActual}...`);
    
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

      // Evitamos duplicar si el cron se ejecuta dos veces en el mismo mes:
      // buscamos si ya existe una factura emitida para este cliente en el mes en curso
      const facturaExiste = await prisma.factura.findFirst({
        where: {
          clienteId: cliente.id,
          vencimiento: {
            gte: inicioDeMes,
            lt: inicioDeMesSiguiente
          }
        }
      });

      if (!facturaExiste) {
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
              pagada: facturaPagada,
              vencimiento: fechaVencimiento
            }
          }),
          prisma.cliente.update({
            where: { id: cliente.id },
            data: { saldo: saldoRestanteCliente }
          })
        ]);

        console.log(`✅ Factura generada para ${cliente.nombre}. Monto: $${montoFinalFactura}. Saldo restante: $${saldoRestanteCliente}`);
      } else {
        console.log(`⏭️  Factura de este mes ya existe para ${cliente.nombre}, se omite.`);
      }
    }

    // -----------------------------------------------------------------
    // TAREA 2: SUSPENSIÓN AUTOMÁTICA DE SERVICIOS POR VENCIMIENTO
    // -----------------------------------------------------------------
    console.log('⚠️ [CRON] Revisando facturas vencidas para aplicar suspensiones...');

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
        const idsSuspender = factura.cliente.servicios.map(s => s.id);

        await prisma.servicio.updateMany({
          where: { id: { in: idsSuspender } },
          data: { estado: 'SUSPENDIDO' }
        });

        serviciosSuspendidosContador += idsSuspender.length;
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