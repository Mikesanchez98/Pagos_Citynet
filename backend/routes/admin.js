// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken } = require('../middleware/auth');
const { verificarAdmin } = require('../middleware/auth');
const { parse } = require('dotenv');
const PDFDocument = require('pdfkit');

const prisma = new PrismaClient();

// Middleware sencillo para checar si es ADMIN (se puede mejorar luego)
const esAdmin = (req, res, next) => {
  // Aquí podrías consultar la DB, por ahora confiamos en el token decodificado
  next(); 
};

// backend/routes/admin.js

// 1. Obtener todos los clientes (Corregido)
router.get('/clientes', verificarToken, async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      include: { 
        usuario: true, // Corregido: era 'usuario', no 'usuarios'
        servicios: {
          // Traemos SOLO las facturas pendientes. Si el array tiene items = es Moroso.
          include: { facturas: { where: { pagada: false } } } 
        }
      }
    });
    res.json(clientes);
  } catch (error) {
    console.error("[Error Admin Clientes]:", error);
    res.status(500).json({ error: 'Error al obtener lista' });
  }
});

// 2. NUEVA RUTA: Obtener un cliente específico (Resuelve la Pérdida de Contexto en Edición)
// Ruta para obtener el expediente del cliente (COPIA Y PEGA ESTO)
router.get('/cliente/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) },
      include: {
        servicios: {
          include: {
            facturas: true // Lo dejamos simple: traer todas las facturas de este servicio
          }
        },
        pagos: true // Traer todos los pagos
      }
    });

    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

    res.json(cliente);
  } catch (error) {
    console.error("Error GET Cliente:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Cambiar estatus (Activar/Suspender)
router.patch('/servicio/:id/estatus', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body; // "ACTIVO" o "SUSPENDIDO"

  try {
    const actualizado = await prisma.servicio.update({
      where: { id: parseInt(id) },
      data: { estado: nuevoEstado }
    });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo cambiar el estado' });
  }
});

// POST /api/admin/registrar-cliente
router.post('/registrar-cliente', verificarToken, esAdmin, async (req, res) => {
  const { email, password, nombre, numCliente, plan, precio, ip, torreId, direccion, latitud, longitud, telefono } = req.body;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear el Usuario
      const usuario = await tx.usuario.create({
        data: {
          email,
          password, // Recuerda: usar bcrypt en el futuro
          rol: 'CLIENTE'
        }
      });

      // 2. Crear el Cliente vinculado al Usuario
      const cliente = await tx.cliente.create({
        data: {
          nombre,
          numCliente,
          usuarioId: usuario.id,
          torreId: torreId ? parseInt(torreId) : null,
          direccion: direccion || null,
          latitud: latitud? parseFloat(latitud) : null,
          longitud: longitud ? parseFloat(longitud) : null,
          telefono: telefono || null
        }
      });

      // 3. Crear el Servicio vinculado al Cliente
      const servicio = await tx.servicio.create({
        data: {
          plan,
          precio,
          direccionIp: ip,
          clienteId: cliente.id
        }
      });

      return { usuario, cliente, servicio };
    });

    res.json({ mensaje: 'Cliente registrado con éxito', data: resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar cliente (el email o numCliente podrían estar duplicados)' });
  }
});

// --- ACTUALIZACIÓN: GENERAR FACTURAS INTELIGENTES ---  ACTUALMENTE ESTA RUTA NO SE USA, PERO SE QUEDA DE MANERA PROVISIONAL.
router.post('/generar-facturas-mes', verificarToken, async (req, res) => {
  try {
    const servicios = await prisma.servicio.findMany({
      where: { estado: 'ACTIVO' }
    });

    const hoy = new Date();
    // Vencimiento: Día 5 del próximo mes
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 5);

    const facturas = await prisma.$transaction(
      servicios.map((s) => 
        prisma.factura.create({
          data: {
            monto: s.precio, // <--- USA EL PRECIO INDIVIDUAL DE CADA PLAN
            vencimiento: vencimiento,
            pagada: false,
            servicioId: s.id
          }
        })
      )
    );

    res.json({ mensaje: `Se generaron ${facturas.length} facturas personalizadas.` });
  } catch (error) {
    res.status(500).json({ error: 'Error en facturación masiva' });
  }
});

// POST /api/admin/servicio/:id/generar-factura
router.post('/servicio/:id/generar-factura', async (req, res) => {
  const servicioId = parseInt(req.params.id);

  if (isNaN(servicioId)) {
    return res.status(400).json({ error: 'ID de servicio inválido' });
  }

  try {
    // 1. Buscar el servicio para saber cuánto cobrar
    const servicio = await prisma.servicio.findUnique({
      where: { id: servicioId }
    });

    if (!servicio) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    // 2. Calcular la fecha de vencimiento (por ejemplo, 30 días a partir de hoy)
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    // 3. Crear la nueva factura en la base de datos
    const nuevaFactura = await prisma.factura.create({
      data: {
        monto: servicio.precio,
        vencimiento: fechaVencimiento,
        pagada: false, // Nace como deuda pendiente
        servicioId: servicio.id
      }
    });

    console.log(`✅ [Admin] Factura manual generada para el servicio #${servicio.id}`);
    res.status(200).json({ msg: 'Factura generada exitosamente', factura: nuevaFactura });

  } catch (error) {
    console.error('❌ [Admin Error] Error al generar factura manual:', error);
    res.status(500).json({ error: 'Error interno del servidor al generar la factura' });
  }
});

// RUTA PARA ACTUALIZAR CLIENTE
router.put('/cliente/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { nombre, plan, precio, ip, diaCobro, torreId, direccion, latitud, longitud, telefono } = req.body;

  try {
    // Usamos una actualización que incluya los datos del servicio vinculado
    const clienteActualizado = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: {
        nombre: nombre,
        diaCobro: parseInt(diaCobro),
        torreId: torreId ? parseInt(torreId) : null,
        direccion: direccion || null,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
        telefono: telefono || null,
        // Actualizamos el servicio asociado a este cliente
        servicios: {
          updateMany: {
            where: { clienteId: parseInt(id) },
            data: {
              plan: plan,
              precio: parseFloat(precio),
              direccionIp: ip
            }
          }
        }
      }
    });

    res.json({ mensaje: "Cliente actualizado con éxito", clienteActualizado });
  } catch (error) {
    console.error("Error al editar:", error);
    res.status(500).json({ error: "Error interno al intentar actualizar el cliente" });
  }
});

// Marcar factura como pagada manualmente
router.patch('/factura/:id/pagar', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 🛡️ ESCUDO: Si mandan "undefined" o algo que no es número, lo rechazamos suavemente
    if (!id || id === 'undefined') return res.status(400).send("ID inválido");
    const idNumero = parseInt(id);
    if (isNaN(idNumero)) return res.status(400).send("El ID debe ser un número");

    const factura = await prisma.factura.findUnique({
      where: { id: idNumero },
      include: { servicio: true }
    });

    if (!factura) return res.status(404).send("Factura no encontrada");

    await prisma.factura.update({
      where: { id: idNumero },
      data: { pagada: true }
    });

    await prisma.pago.create({
      data: {
        clienteId: factura.servicio.clienteId,
        monto: parseFloat(factura.monto),
        metodoPago: 'Efectivo',
        mesCorrespondiente: 'Pago de Factura Manual',
        notas: `Liquidación de factura #${idNumero}`
      }
    });

    res.json({ message: "Factura liquidada con éxito" });
  } catch (error) {
    console.error("Error al actualizar factura:", error);
    res.status(500).send("Error al actualizar");
  }
});

// Eliminar factura
router.delete('/factura/:id', verificarToken, async (req, res) => {
  try {
    await prisma.factura.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ mensaje: "Factura eliminada" });
  } catch (error) {
    res.status(500).json({ error: "No se pudo eliminar" });
  }
});

//Eliminar cliente (y en cascada su usuario, servicios y facturas)
router.delete('/clientes/:id', verificarToken, verificarAdmin, async (req, res) => {
  const clienteId = parseInt(req.params.id);

  try{
    //Usamos una transacción para borrar el orden (primero facturas, luego servicios, luego cliente y usuario)
    await prisma.$transaction(async (tx) => {
      //1. Borrar facturas de los servicios de este cliente
      await tx.factura.deleteMany({
        where: {servicio: { clienteId: clienteId } }
      });
      //2. Borrar los servicios
      await tx.servicio.deleteMany({
        where: { clienteId: clienteId }
      });
      //3. Finalmente, borrar el cliente (y por cascada su usuario)
      await tx.cliente.delete({
        where: { id: clienteId}
      });
    });

    res.json({ mensaje: "Cliente y todo su historial eliminado correctamente" });
  } catch (error) {
    console.error("[Error al eliminar cliente]:", error);
    res.status(500).json({ error: "Error interno al intentar eliminar el cliente" });
  }
});

// Generar facturas masivas
router.post('/facturas/generar-lote', verificarToken, verificarAdmin, async (req, res) => {
  const { diaCobro } = req.body; 

  if (diaCobro !== 1 && diaCobro !== 15) {
    return res.status(400).json({ error: "El dia de cobro debe ser 1 o 15" });
  }

  try {
    const clientesDelGrupo = await prisma.cliente.findMany({
      where: { diaCobro: parseInt(diaCobro) },
      include: { servicios: true }
    });

    let facturasGeneradas = 0;

    for (const cliente of clientesDelGrupo) {
      for (const servicio of cliente.servicios) {
        
        // Calculamos los 5 días para el vencimiento
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 5);

        await prisma.factura.create({
          data: {
            servicioId: servicio.id,
            monto: servicio.precio,
            // CORRECCIÓN AQUÍ: Usamos "vencimiento" tal como lo tienes en el resto de tu app
            vencimiento: fechaVencimiento,
            pagada: false
          }
        });
        facturasGeneradas++;
      }
    }

    res.json({
      mensaje: `Proceso completado. Se generaron ${facturasGeneradas} facturas para el grupo del dia ${diaCobro}.`
    });

  } catch (error) {
    // Te agrego este console.log más específico para que si vuelve a fallar, la terminal de Node te diga EXACTAMENTE qué falló
    console.error("❌ [Error Prisma en generar facturas por lote]:", error.message || error);
    res.status(500).json({ error: "Error interno al generar facturas por lote" });
  }
});

//OBTENER LAS TORRES
router.get('/torres', verificarToken, async (req, res) => {
  try {
    //Traemos las torres e incluimos a los clientes conectados a cada una para futuras estadísticias
    const torres = await prisma.torre.findMany({
      include: { clientes: true }
    });
    res.json(torres);
  } catch (error) {
    console.error("Error al obtener torres:", error);
    res.status(500).json({ error: "Error al obtener torres" });
  }
});

//CREAR UNA NUEVA TORRE
router.post('/torres', verificarToken, async (req, res) => {
  const { nombre, latitud, longitud } = req.body;
  try {
    const nuevaTorre = await prisma.torre.create({
      data: {
        nombre,
        latitud: parseFloat(latitud),
        longitud: parseFloat(longitud)
      }
    });
    res.json({ mensaje: "Torre creada exitosamente", torre: nuevaTorre });
  } catch (error) {
    console.error("Error al crear torre:", error);
    res.status(500).json({ error: "Error al crear torre" });
  }
});

router.put('/torres/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { nombre, latitud, longitud } = req.body;
  try {
    const torreActualizada = await prisma.torre.update({
      where: { id: parseInt(id) },
      data: {
        nombre,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
      },
    });
    res.json(torreActualizada);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar torre" });
  }
});

// -- RUTAS DE PAGOS--
//Registrar Nuevo Pago
router.post('/pagos', async (req, res) => {
  const { clienteId, monto, mesCorrespondiente, metodoPago, notas } = req.body;

  try {
    // 1. Crear el registro del Pago usando Prisma
    const nuevoPago = await prisma.pago.create({
      data: {
        clienteId: parseInt(clienteId), // Asegúrate de que el tipo coincida con tu schema (int o string)
        monto: parseFloat(monto),
        mesCorrespondiente: mesCorrespondiente || '',
        metodoPago: metodoPago || 'Efectivo',
        notas: notas || ''
      }
    });

    // 2. Buscar facturas pendientes a través de la relación con el Servicio
    const facturasPendientes = await prisma.factura.findMany({
      where: {
        // Le decimos a Prisma: Busca en la tabla relacionada 'servicio' 
        // aquel que pertenezca a este clienteId
        servicio: {
          clienteId: parseInt(clienteId)
        },
        pagada: false
      },
      orderBy: {
        // Usamos 'vencimiento' porque es el campo de fecha que existe en tu tabla
        vencimiento: 'asc' 
      }
    });

    let saldoRestante = parseFloat(monto);

    // 3. Ir "pagando" las facturas con el saldo
    for (const factura of facturasPendientes) {
      if (saldoRestante <= 0) break;

      const montoFactura = parseFloat(factura.monto);

      if (saldoRestante >= montoFactura) {
        // El pago cubre toda la factura, la actualizamos en Prisma
        await prisma.factura.update({
          where: { id: factura.id },
          data: { 
            pagada: true,
            // pagoId: nuevoPago.id // Descomenta esta línea si en tu schema.prisma agregaste una relación entre Pago y Factura
          }
        });
        saldoRestante -= montoFactura;
      } else {
        // Si no alcanza a cubrir la factura completa, nos detenemos
        break; 
      }
    }

    res.status(201).json({ 
      message: "Pago registrado y facturas actualizadas", 
      pago: nuevoPago 
    });

  } catch (error) {
    console.error("Error al registrar pago en Prisma:", error);
    res.status(500).json({ message: "Error al procesar el pago" });
  }
});

//Obtener el historial de pagos de un cliente específico
router.get('/pagos/:clienteId', verificarToken, async (req, res) => {
  const { clienteId } = req.params;
  try {
    const historial = await prisma.pago.findMany({
      where: { clienteId: parseInt(clienteId) },
      orderBy: { fecha: 'desc' }
    });
    res.json(historial);
  } catch (error) {
    console.error("Error al obtener historial de pagos:", error);
    res.status(500).json({ error: "Error al obtener historial de pagos" });
  }
});

// --- RUTA DE ESTADÍSTICAS (Logistica) ---
router.get('/dashboard-stats', verificarToken, async (req, res) => {
  try {
    const totalClientes = await prisma.cliente.count();
    const servicios = await prisma.servicio.findMany();
    
    const activos = servicios.filter(s => s.estado === 'ACTIVO').length;
    const suspendidos = servicios.filter(s => s.estado === 'SUSPENDIDO').length;

    // CORRECCIÓN AQUÍ: Usamos Number() para asegurar que sea suma matemática
    const ingresosProyectados = servicios
      .filter(s => s.estado === 'ACTIVO')
      .reduce((sum, s) => sum + Number(s.precio || 0), 0);

    // CORRECCIÓN AQUÍ: También para los ingresos reales
    const fechaInicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const pagosEsteMes = await prisma.pago.findMany({
      where: { fecha: { gte: fechaInicioMes } }
    });
    
    const ingresosReales = pagosEsteMes.reduce((sum, p) => sum + Number(p.monto || 0), 0);

    res.json({
      totalClientes,
      activos,
      suspendidos,
      ingresosProyectados,
      ingresosReales
    });
  } catch (error) {
    console.error("Error obteniendo stats:", error);
    res.status(500).json({ error: "Error al cargar estadísticas" });
  }
});

//Generacion de pdf
router.get('/pago/:id/pdf', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscamos el pago con los datos del cliente y el servicio
    const pago = await prisma.pago.findUnique({
      where: { id: parseInt(id) },
      include: {
        cliente: {
          include: { servicios: true }
        }
      }
    });

    if (!pago) return res.status(404).json({ error: "Pago no encontrado" });

    // Configuración del documento PDF
    const doc = new PDFDocument({ size: 'A6', margin: 30 }); // Tamaño pequeño tipo ticket
    
    // Configurar el nombre del archivo al descargar
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo_citynet_${pago.id}.pdf`);

    doc.pipe(res);

    // --- DISEÑO DEL RECIBO ---
    
    // Encabezado
    doc.fillColor('#1e293b').fontSize(16).text('CITYNET', { align: 'center', weight: 'bold' });
    doc.fontSize(8).text('Internet de Alta Velocidad', { align: 'center' });
    doc.moveDown();
    doc.moveTo(30, doc.y).lineTo(250, doc.y).stroke('#e2e8f0');
    doc.moveDown();

    // Información del Cliente
    doc.fillColor('#64748b').fontSize(8).text('CLIENTE:');
    doc.fillColor('#000000').fontSize(10).text(pago.cliente.nombre.toUpperCase());
    doc.fontSize(8).text(`Dirección: ${pago.cliente.direccion || 'No especificada'}`);
    doc.moveDown();

    // Detalles del Pago
    doc.rect(30, doc.y, 220, 60).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#1e293b');
    
    let yPos = doc.y + 10;
    doc.fontSize(8).text('CONCEPTO', 40, yPos);
    doc.text('MONTO', 200, yPos);
    
    yPos += 15;
    doc.fontSize(10).fillColor('#000000').text('Pago de Servicio Mensual', 40, yPos);
    doc.text(`$${pago.monto}`, 200, yPos);

    yPos += 20;
    doc.fontSize(8).fillColor('#64748b').text(`Fecha: ${new Date(pago.fecha).toLocaleDateString()}`, 40, yPos);
    doc.text(`ID: #${pago.id}`, 200, yPos);

    // Total
    doc.moveDown(4);
    doc.fontSize(12).fillColor('#10b981').text(`TOTAL PAGADO: $${pago.monto}`, { align: 'right' });

    // Pie de página
    doc.moveDown(2);
    doc.fillColor('#94a3b8').fontSize(7).text('Gracias por su preferencia.', { align: 'center' });
    doc.text('Citynet - Conectando tu mundo', { align: 'center' });

    doc.end();

  } catch (error) {
    console.error("Error generando PDF:", error);
    res.status(500).json({ error: "Error al generar el recibo" });
  }
});

// Ruta para obtener el expediente completo del cliente
router.get('/cliente/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) },
      include: {
        servicios: {
          include: {
            facturas: {
              orderBy: { vencimiento: 'desc' } // <-- CORREGIDO: Tu schema usa 'vencimiento'
            }
          }
        },
        pagos: {
          orderBy: { fecha: 'desc' } // <-- CORREGIDO: Tu schema usa 'fecha'
        }
      }
    });

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    res.json(cliente);
  } catch (error) {
    console.error("Error al cargar expediente:", error);
    res.status(500).json({ message: "Error interno" });
  }
});

// Registrar un pago desde el detalle del cliente
router.post('/cliente/:id/pagar', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { monto } = req.body;

    const nuevoPago = await prisma.pago.create({
      data: {
        monto: Number(monto),
        fecha: new Date(), // Fecha actual
        clienteId: parseInt(id)
      }
    });

    res.json({ message: "Pago registrado con éxito", nuevoPago });
  } catch (error) {
    res.status(500).json({ error: "Error al registrar el pago" });
  }
});

// Ruta para descargar/ver el PDF de una factura
router.get('/factura/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscamos la factura e incluimos la información en cadena: Factura -> Servicio -> Cliente
    const factura = await prisma.factura.findUnique({
      where: { id: parseInt(id) },
      include: {
        servicio: {
          include: {
            cliente: true
          }
        }
      }
    });

    if (!factura) return res.status(404).send("Factura no encontrada");

    // Configuramos la respuesta del servidor para que entienda que es un PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Recibo_${factura.id}_${factura.servicio.cliente.nombre.replace(/\s+/g, '_')}.pdf`);

    // Creamos el documento PDF
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res); // Conectamos el PDF directamente a la respuesta del servidor

    // --- DISEÑO DEL RECIBO ---
    // Encabezado
    doc.fontSize(20).font('Helvetica-Bold').text('CITYNET PAGOS', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Comprobante de Servicio de Internet', { align: 'center' });
    doc.moveDown(2);

    // Datos de la Factura
    doc.fontSize(14).font('Helvetica-Bold').text('Detalles del Recibo', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica')
       .text(`Folio de Factura: #${factura.id}`)
       .text(`Fecha de Emisión: ${new Date(factura.fechaEmision).toLocaleDateString()}`)
       .text(`Estado: ${factura.pagada ? 'PAGADA' : 'PENDIENTE'}`);
    doc.moveDown();

    // Datos del Cliente
    doc.fontSize(14).font('Helvetica-Bold').text('Datos del Cliente', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica')
       .text(`Nombre: ${factura.servicio.cliente.nombre}`)
       .text(`Dirección: ${factura.servicio.cliente.direccion || 'N/A'}`)
       .text(`Plan Contratado: ${factura.servicio.plan}`)
       .text(`IP Asignada: ${factura.servicio.direccionIp || 'N/A'}`);
    doc.moveDown(2);

    // Total
    doc.fontSize(16).font('Helvetica-Bold').text(`Monto Total: $${factura.monto}`, { align: 'right' });

    // Pie de página
    doc.moveDown(4);
    doc.fontSize(10).font('Helvetica-Oblique').text('Gracias por su preferencia.', { align: 'center' });

    // Finalizamos y enviamos el PDF
    doc.end();

  } catch (error) {
    console.error("Error al generar PDF:", error);
    res.status(500).send("Error al generar el documento PDF");
  }
});

// Ruta para generar una factura manualmente
router.post('/servicio/:servicioId/generar-factura', async (req, res) => {
  try {
    const { servicioId } = req.params;
    const { monto } = req.body;

    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 5);

    const nuevaFactura = await prisma.factura.create({
      data: {
        servicioId: parseInt(servicioId),
        monto: parseFloat(monto),
        vencimiento: fechaVencimiento, // <-- CORREGIDO: Solo enviamos vencimiento
        pagada: false
      }
    });

    res.status(201).json({ message: "Factura generada con éxito", factura: nuevaFactura });
  } catch (error) {
    console.error("Error al generar factura manual:", error);
    res.status(500).json({ message: "Error al generar la factura" });
  }
});

module.exports = router;