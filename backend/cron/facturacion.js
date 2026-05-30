const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🕒 SE EJECUTA TODOS LOS DÍAS A LA MEDIANOCHE (00:00)
cron.schedule('0 6 * * *', async () => {
  console.log('=== 🤖 INICIANDO TAREAS AUTOMÁTICAS DE MEDIANOCHE ===');
  const hoy = new Date();
  const diaActual = hoy.getDate(); // Te da un número del 1 al 31
  
  // Obtener el nombre del mes actual en español (ej: "Enero", "Febrero")
  const mesActual = hoy.toLocaleString('es-MX', { month: 'long' }).toUpperCase();
  const añoActual = hoy.getFullYear();
  const stringMesCorrespondiente = `${mesActual}-${añoActual}`; // Ej: "MAYO-2026"

  try {
    // -------------------------------------------------------------
    // TASK 1: GENERACIÓN AUTOMÁTICA DE FACTURAS (Para el grupo de hoy)
    // -------------------------------------------------------------
    if (diaActual === 1 || diaActual === 15) {
      console.log(`Generando facturas automáticas para el Grupo del día ${diaActual}...`);
      
      // 1. Buscar todos los clientes activos que pertenecen a este grupo de cobro
      const clientesDelGrupo = await prisma.cliente.findMany({
        where: { 
          diaCobro: diaActual,
          servicio: { estado: 'ACTIVO' } 
        },
        include: { servicio: true }
      });

      for (const cliente of clientesDelGrupo) {
        // Verificar si ya se le generó factura este mes para no duplicar
        const facturaExiste = await prisma.factura.findFirst({
          where: {
            clienteId: cliente.id,
            mes: stringMesCorrespondiente
          }
        });

        if (!facturaExiste && cliente.servicio) {
          // Crear la factura en la base de datos de manera automática
          await prisma.factura.create({
            data: {
              clienteId: cliente.id,
              monto: cliente.servicio.precio,
              mes: stringMesCorrespondiente,
              estado: 'PENDIENTE',
              fechaEmision: new Date()
            }
          });
        }
      }
      console.log(`✅ Facturas del Grupo ${diaActual} procesadas.`);
    }

    // -------------------------------------------------------------
    // TASK 2: SUSPENSIÓN AUTOMÁTICA POR FALTA DE PAGO
    // -------------------------------------------------------------
    // Por ejemplo: Si es día 5 (tolerancia para el Grupo 1) o día 20 (tolerancia para el Grupo 15)
    // Tú puedes cambiar estos números (5 y 20) por los días exactos en que cortas el internet.
    const DIAS_DE_CORTE = [5, 20]; 

    if (DIAS_DE_CORTE.includes(diaActual)) {
      // Determinar qué grupo vamos a revisar para cortar
      const grupoACortar = diaActual === 5 ? 1 : 15;
      console.log(`Revisando impagos para aplicar suspensiones al Grupo ${grupoACortar}...`);

      // 1. Buscar clientes de ese grupo que tengan facturas PENDIENTES del mes en curso
      const facturasVencidas = await prisma.factura.findMany({
        where: {
          mes: stringMesCorrespondiente,
          estado: 'PENDIENTE',
          cliente: { diaCobro: grupoACortar }
        },
        include: { cliente: { include: { servicio: true } } }
      });

      let suspendidosContador = 0;
      for (const factura of facturasVencidas) {
        if (factura.cliente?.servicio?.estado === 'ACTIVO') {
          // Cambiar estado del servicio a SUSPENDIDO en la base de datos
          await prisma.servicio.update({
            where: { id: factura.cliente.servicio.id },
            data: { estado: 'SUSPENDIDO' }
          });
          suspendidosContador++;
        }
      }
      console.log(`✅ Corte completado. Se suspendieron ${suspendidosContador} clientes por adeudo.`);
    }

  } catch (error) {
    console.error('❌ Error ejecutando las tareas automatizadas:', error);
  }
  console.log('=== 🤖 FIN DE LAS TAREAS AUTOMÁTICAS ===');
});

module.exports = iniciarCronFacturacion;