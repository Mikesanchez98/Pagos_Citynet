// backend/services/automatizacion.js
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🕒 SE EJECUTA TODOS LOS DÍAS A LA MEDIANOCHE (00:00) EN HORA CDMX
cron.schedule('0 0 * * *', async () => {
  console.log('=== 🤖 [CRON] INICIANDO TAREAS AUTOMÁTICAS DE MEDIANOCHE ===');
  
  const hoy = new Date();
  const diaActual = hoy.getDate(); // Número del 1 al 28-31
  
  // Identificador del mes (Ej: "JUNIO-2026")
  const mesActual = hoy.toLocaleString('es-MX', { month: 'long' }).toUpperCase();
  const añoActual = hoy.getFullYear();
  const stringMesCorrespondiente = `${mesActual}-${añoActual}`;

  try {
    // -----------------------------------------------------------------
    // TAREA 1: GENERACIÓN DINÁMICA DE FACTURAS (Petición de tu Jefe)
    // -----------------------------------------------------------------
    console.log(`[CRON] Buscando clientes con día de cobro: ${diaActual}...`);
    
    // Buscamos los clientes que les toca pagar hoy y traemos sus servicios activos
    const clientesDelGrupo = await prisma.cliente.findMany({
      where: { diaCobro: diaActual },
      include: { 
        servicios: { where: { estado: 'ACTIVO' } } 
      }
    });

    for (const cliente of clientesDelGrupo) {
      for (const servicio of cliente.servicios) {
        
        // Evitamos duplicar facturas si el cron corre dos veces por error
        const facturaExiste = await prisma.factura.findFirst({
          where: {
            servicioId: servicio.id,
            mes: stringMesCorrespondiente
          }
        });

        if (!facturaExiste) {
          // 🗓️ CÁLCULO DE VENCIMIENTO: Le damos 4 días de tolerancia 
          // (Si cobra el 1 vence el 5, si cobra el 15 vence el 19, si cobra el 2 vence el 6)
          const fechaVencimiento = new Date();
          fechaVencimiento.setDate(hoy.getDate() + 4);

          await prisma.factura.create({
            data: {
              servicioId: servicio.id,
              monto: servicio.precio,
              mes: stringMesCorrespondiente,
              pagada: false, // Usando el booleano de tu segundo archivo
              fechaEmision: new Date(),
              vencimiento: fechaVencimiento // Guardamos su fecha límite real
            }
          });
          console.log(`📄 Factura generada para ${cliente.nombre} (Servicio #${servicio.id})`);
        }
      }
    }

    // -----------------------------------------------------------------
    // TAREA 2: SUSPENSIÓN DINÁMICA POR VENCIMIENTO (Tu segundo archivo optimizado)
    // -----------------------------------------------------------------
    console.log('⚠️ [CRON] Revisando facturas vencidas para aplicar suspensiones...');

    const facturasVencidas = await prisma.factura.findMany({
      where: {
        pagada: false,
        vencimiento: { lt: hoy },
        servicio: { estado: 'ACTIVO' }
      },
      select: { servicioId: true } 
    });

    if (facturasVencidas.length > 0) {
      const servicioIds = facturasVencidas.map(f => f.servicioId);

      // Suspendemos todos los servicios morosos en una sola ráfaga (updateMany)
      const suspensiones = await prisma.servicio.updateMany({
        where: { id: { in: servicioIds } },
        data: { estado: 'SUSPENDIDO' }
      });

      console.log(`🚨 [CRON] Se suspendieron ${suspensiones.count} servicios por falta de pago.`);
    } else {
      console.log('✅ [CRON] No hay servicios morosos por suspender hoy.');
    }

  } catch (error) {
    console.error('❌ [CRON ERROR] Falló la automatización diaria:', error);
  }
  
  console.log('=== 🤖 [CRON] FIN DE LAS TAREAS AUTOMÁTICAS ===');
}, {
  scheduled: true,
  timezone: "America/Mexico_City" // Control total del horario local
});

// Exportamos una función vacía por si la necesitas invocar o inicializar en tu server.js
module.exports = () => {
  console.log("⏰ Cron Jobs de Citynet inicializados correctamente.");
};