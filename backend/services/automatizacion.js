const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Ejecución a las 00:00 exactas, obligando la zona horaria de México
cron.schedule('0 0 * * *', async () => {
  console.log('--- [CRON] Iniciando revisión de facturas vencidas ---');
  
  try {
    const hoy = new Date();

    const facturasVencidas = await prisma.factura.findMany({
      where: {
        pagada: false,
        vencimiento: { lt: hoy },
        servicio: { estado: 'ACTIVO' }
      },
      // Solo necesitamos el ID del servicio, no todo el objeto
      select: { servicioId: true } 
    });

    if (facturasVencidas.length === 0) {
      console.log('✅ [CRON] No hay servicios morosos por suspender hoy.');
      return;
    }

    // Extraemos un arreglo limpio de puros IDs [1, 5, 8, 12...]
    const servicioIds = facturasVencidas.map(f => f.servicioId);

    // OPTIMIZACIÓN: updateMany hace 1 sola consulta a la DB, en lugar de N consultas
    const suspensiones = await prisma.servicio.updateMany({
      where: { id: { in: servicioIds } },
      data: { estado: 'SUSPENDIDO' }
    });

    console.log(`⚠️ [CRON] Se suspendieron ${suspensiones.count} servicios por falta de pago.`);
  } catch (error) {
    console.error('❌ [CRON ERROR] Falló la tarea de suspensión automática:', error);
  }
}, {
  scheduled: true,
  timezone: "America/Mexico_City" // <-- CLAVE PARA NEGOCIOS LOCALES
});