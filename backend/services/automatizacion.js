const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Se ejecuta todos los días a la medianoche (00:00)
cron.schedule('0 0 * * *', async () => {
  console.log('--- Iniciando revisión de facturas vencidas ---');
  
  try {
    const hoy = new Date();

    // 1. Buscar facturas no pagadas que ya vencieron
    const facturasVencidas = await prisma.factura.findMany({
      where: {
        pagada: false,
        vencimiento: {
          lt: hoy // "lt" significa "menor que" (fecha pasada)
        },
        servicio: {
          estado: 'ACTIVO' // Solo nos interesan los que aún están activos
        }
      },
      include: {
        servicio: true
      }
    });

    if (facturasVencidas.length === 0) {
      console.log('No hay servicios por suspender hoy.');
      return;
    }

    // 2. Suspender servicios asociados
    const suspensiones = facturasVencidas.map(factura => {
      return prisma.servicio.update({
        where: { id: factura.servicioId },
        data: { estado: 'SUSPENDIDO' }
      });
    });

    await Promise.all(suspensiones);

    console.log(`Se han suspendido ${facturasVencidas.length} servicios por falta de pago.`);
  } catch (error) {
    console.error('Error en la tarea de suspensión automática:', error);
  }
});