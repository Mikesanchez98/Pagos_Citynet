const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuración de CRON: '0 1 * * *' significa "Todos los días a la 1:00 AM"
const iniciarCronFacturacion = () => {
  cron.schedule('0 1 * * *', async () => {
    console.log('⏳ [CRON] Iniciando proceso automático de facturación...');
    
    try {
      const hoy = new Date();
      const diaActual = hoy.getDate(); // Obtenemos el día del mes (1-31)

      // 1. Buscamos todos los clientes cuyo diaCobro coincida con hoy
      const clientes = await prisma.cliente.findMany({
        where: { diaCobro: diaActual },
        include: {
          servicios: {
            where: { estado: 'ACTIVO' } // Solo facturamos servicios activos
          }
        }
      });

      let facturasGeneradas = 0;

      // 2. Iteramos sobre los clientes y sus servicios para crear las facturas
      for (const cliente of clientes) {
        for (const servicio of cliente.servicios) {
          
          // Calculamos el vencimiento (ejemplo: les damos 5 días para pagar)
          const fechaVencimiento = new Date();
          fechaVencimiento.setDate(fechaVencimiento.getDate() + 5);

          // Creamos la factura en la base de datos
          await prisma.factura.create({
            data: {
              monto: servicio.precio,
              vencimiento: fechaVencimiento,
              pagada: false,
              servicioId: servicio.id,
            }
          });
          
          facturasGeneradas++;
        }
      }

      console.log(`✅ [CRON] Facturación exitosa. Se generaron ${facturasGeneradas} facturas nuevas.`);

    } catch (error) {
      console.error('❌ [CRON] Error crítico en la facturación automática:', error);
    }
  });

  console.log('⏰ Servicio de facturación automática programado.');
};

module.exports = iniciarCronFacturacion;