// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken } = require('../middleware/auth');
const { verificarAdmin } = require('../middleware/auth');
const { parse } = require('dotenv');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

//Configuracion para guardar el archivo temporalmente
const upload = multer({ dest: 'uploads/' });

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
        paquete: true,
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
        usuario: true, // Traemos el usuario para mostrar email en el expediente
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

// POST /api/admin/servicio/:id/generar-factura
router.post('/servicio/:id/generar-factura', async (req, res) => {
  const servicioId = parseInt(req.params.id);
  if (isNaN(servicioId)) return res.status(400).json({ error: 'ID de servicio inválido' });

  try {
    // 1. Buscamos el servicio incluyendo al cliente para conocer su saldo actual
    const servicio = await prisma.servicio.findUnique({
      where: { id: servicioId },
      include: { cliente: true } // 💡 Traemos los datos del cliente vinculados
    });

    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });

    const { monto } = req.body;
    const precioBase = (monto !== undefined && monto !== '') ? parseFloat(monto) : servicio.precio;

    // 2. 🧠 LÓGICA DE DESCUENTO POR SALDO A FAVOR
    let montoFinalFactura = precioBase;
    let saldoRestanteCliente = servicio.cliente.saldo || 0;
    let facturaPagada = false;

    if (saldoRestanteCliente > 0) {
      if (saldoRestanteCliente >= precioBase) {
        // El saldo a favor cubre TODA la factura por completo
        saldoRestanteCliente -= precioBase;
        montoFinalFactura = 0; // La factura queda en $0
        facturaPagada = true;  // Se marca como pagada automáticamente
      } else {
        // El saldo cubre solo una parte, se descuenta lo que se pueda
        montoFinalFactura = precioBase - saldoRestanteCliente;
        saldoRestanteCliente = 0; // El saldo se agota
      }
    }

    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    // 3. 🔒 TRANSACCIÓN: Creamos la factura y actualizamos el saldo del cliente al mismo tiempo
    const [nuevaFactura] = await prisma.$transaction([
      prisma.factura.create({
        data: {
          monto: montoFinalFactura,
          vencimiento: fechaVencimiento,
          pagada: facturaPagada,
          servicioId: servicio.id
        }
      }),
      prisma.cliente.update({
        where: { id: servicio.clienteId },
        data: { saldo: saldoRestanteCliente }
      })
    ]);

    console.log(`✅ Factura generada por $${montoFinalFactura}. Saldo restante del cliente: $${saldoRestanteCliente}`);
    res.status(200).json({ msg: 'Factura generada exitosamente', factura: nuevaFactura });

  } catch (error) {
    console.error('❌ Error al generar factura con saldo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RUTA PARA ACTUALIZAR CLIENTE
router.put('/cliente/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  
  // 1. Extraemos email (nombre de usuario) y password del req.body
  const { nombre, paqueteId, ip, diaCobro, torreId, direccion, latitud, longitud, telefono, email, password } = req.body;

  try {
    let datosServicio = { direccionIp: ip };
    
    if (paqueteId) {
      const paqueteInfo = await prisma.paquete.findUnique({ where: { id: paqueteId } });
      if (paqueteInfo) {
        datosServicio.plan = paqueteInfo.nombre;
        datosServicio.precio = paqueteInfo.precio;
      }
    }

    // 2. Preparamos los datos del Usuario para actualizar
    let datosUsuario = { email: email }; // 'email' guarda tu nuevo nombre de usuario
    // Solo actualizamos la contraseña si el admin escribió una nueva
    if (password && password.trim() !== "") {
      datosUsuario.password = password; 
    }

    const clienteActualizado = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: {
        nombre: nombre,
        diaCobro: diaCobro ? parseInt(diaCobro) : null,
        paquete: paqueteId
        ? { connect: { id: paqueteId } }
        : { disconnect: true }, // Si no envían paqueteId, desconectamos cualquier relación existente
        torre: torreId 
        ? { connect: { id: parseInt(torreId) } }  // Si hay torre, la conecta por su ID
        : { disconnect: true },
        direccion: direccion || null,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
        telefono: telefono || null,
        
        // 3. Actualizamos los datos de acceso (Usuario)
        usuario: {
          update: datosUsuario
        },
        
        // Actualizamos el servicio
        servicios: {
          updateMany: {
            where: { clienteId: parseInt(id) },
            data: datosServicio
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
// Registrar Nuevo Pago
router.post('/pagos', async (req, res) => {
  const { clienteId, monto, mesCorrespondiente, metodoPago, notas } = req.body;

  try {
    let saldoRestante = parseFloat(monto);

    // 1. Crear el registro del Pago usando Prisma (Historial)
    const nuevoPago = await prisma.pago.create({
      data: {
        clienteId: parseInt(clienteId), 
        monto: parseFloat(monto),
        mesCorrespondiente: mesCorrespondiente || '',
        metodoPago: metodoPago || 'Efectivo',
        notas: notas || ''
      }
    });

    // 2. Buscar facturas pendientes (de la más vieja a la más nueva)
    const facturasPendientes = await prisma.factura.findMany({
      where: {
        servicio: { clienteId: parseInt(clienteId) },
        pagada: false
      },
      orderBy: { vencimiento: 'asc' }
    });

    // 3. Ir "pagando" las facturas con el saldo en cascada
    for (const factura of facturasPendientes) {
      if (saldoRestante <= 0) break;

      const montoFactura = parseFloat(factura.monto);

      if (saldoRestante >= montoFactura) {
        // El pago cubre toda la factura, la marcamos como pagada
        await prisma.factura.update({
          where: { id: factura.id },
          data: { pagada: true }
        });
        saldoRestante -= montoFactura;
      } else {
        // PAGO PARCIAL: El dinero no alcanza para toda la factura.
        // Descontamos lo que quede y nos detenemos.
        await prisma.factura.update({
          where: { id: factura.id },
          data: { monto: montoFactura - saldoRestante }
        });
        saldoRestante = 0; // Se agotó el dinero
        break; 
      }
    }

    // 4. 🧠 LÓGICA DE SALDO A FAVOR (WALLET)
    // Si después de pagar todas las facturas aún sobra dinero, se va al saldo del cliente
    if (saldoRestante > 0) {
      await prisma.cliente.update({
        where: { id: parseInt(clienteId) },
        data: {
          saldo: { increment: saldoRestante } // Suma el excedente al saldo actual
        }
      });
      console.log(`💰 Saldo a favor de $${saldoRestante} guardado para el cliente #${clienteId}`);
    }

    res.status(201).json({ 
      message: saldoRestante > 0 
        ? `Pago registrado. Se guardó un saldo a favor de $${saldoRestante}` 
        : "Pago registrado y facturas actualizadas", 
      pago: nuevoPago 
    });

  } catch (error) {
    console.error("Error al registrar pago en Prisma:", error);
    res.status(500).json({ message: "Error al procesar el pago" });
  }
});

// ==========================================
// RUTA CORREGIDA: HISTORIAL DE PAGOS LOGÍSTICA
// ==========================================
router.get('/pagos/historial', verificarToken, async (req, res) => {
  try {
    const { filtro } = req.query; // Puede ser HOY, SEMANA, MES, TODOS
    
    // Configuración de fechas para los filtros
    const ahora = new Date();
    let fechaInicio = new Date(0); // Por defecto: desde el inicio de los tiempos (TODOS)

    if (filtro === 'HOY') {
      fechaInicio = new Date(ahora.setHours(0, 0, 0, 0));
    } else if (filtro === 'SEMANA') {
      const diaSemana = ahora.getDay();
      const diff = ahora.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1); // Ajustar al lunes
      fechaInicio = new Date(ahora.setDate(diff));
      fechaInicio.setHours(0, 0, 0, 0);
    } else if (filtro === 'MES') {
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    }

    // Consulta a la base de datos usando Prisma (Corregida con 'fecha')
    const pagos = await prisma.pago.findMany({
      where: filtro !== 'TODOS' ? {
        fecha: { // 🟢 CORREGIDO: Antes decía createdAt
          gte: fechaInicio
        }
      } : {},
      include: {
        cliente: {
          select: { nombre: true }
        }
      },
      orderBy: {
        fecha: 'desc' // 🟢 CORREGIDO: Antes decía createdAt
      }
    });

    res.json(pagos);
  } catch (error) {
    console.error("Error al obtener el historial de pagos:", error);
    res.status(500).json({ error: "Error al cargar los pagos." });
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

// Registrar un pago desde el detalle del cliente
router.post('/cliente/:id/pagar', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { monto } = req.body;
    
    let saldoRestante = Number(monto);

    // 1. Crear el registro del Pago (Historial)
    const nuevoPago = await prisma.pago.create({
      data: {
        monto: Number(monto),
        fecha: new Date(), // Fecha actual
        clienteId: parseInt(id)
      }
    });

    // 2. Buscar las facturas pendientes de este cliente específico
    const facturasPendientes = await prisma.factura.findMany({
      where: {
        servicio: { clienteId: parseInt(id) },
        pagada: false
      },
      orderBy: { vencimiento: 'asc' }
    });

    // 3. Pagar las facturas en cascada
    for (const factura of facturasPendientes) {
      if (saldoRestante <= 0) break;

      const montoFactura = parseFloat(factura.monto);

      if (saldoRestante >= montoFactura) {
        // Alcanza para pagar la factura completa
        await prisma.factura.update({
          where: { id: factura.id },
          data: { pagada: true }
        });
        saldoRestante -= montoFactura;
      } else {
        // Pago parcial
        await prisma.factura.update({
          where: { id: factura.id },
          data: { monto: montoFactura - saldoRestante }
        });
        saldoRestante = 0;
        break;
      }
    }

    // 4. Lógica de saldo a favor (Wallet)
    if (saldoRestante > 0) {
      await prisma.cliente.update({
        where: { id: parseInt(id) },
        data: {
          saldo: { increment: saldoRestante }
        }
      });
    }

    res.json({ 
      message: saldoRestante > 0 
        ? `Pago registrado y saldo a favor de $${saldoRestante} guardado` 
        : "Pago registrado y facturas actualizadas con éxito", 
      nuevoPago 
    });

  } catch (error) {
    console.error("Error al registrar el pago desde cliente:", error);
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

// ==========================================
// 🛠️ MÓDULO DE SOPORTE TÉCNICO (TICKETS)
// ==========================================

// 1. OBTENER TODOS LOS TICKETS (Para el panel global de técnicos)
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({
      include: { 
        cliente: {
          select: { nombre: true, telefono: true, direccion: true } 
        } 
      },
      orderBy: { createdAt: 'desc' } // Los más nuevos primero
    });
    res.json(tickets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los tickets" });
  }
});

// 2. CREAR UN TICKET PARA UN CLIENTE
router.post('/cliente/:id/tickets', async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, prioridad } = req.body;
  
  try {
    const nuevoTicket = await prisma.ticket.create({
      data: {
        titulo,
        descripcion,
        prioridad: prioridad || 'MEDIA',
        clienteId: parseInt(id) // OJO: Si tu clienteId no es número, quita el parseInt()
      }
    });
    res.json(nuevoTicket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el ticket" });
  }
});

// 3. ACTUALIZAR UN TICKET (Cambiar estatus o agregar notas)
router.put('/tickets/:id', async (req, res) => {
  const { id } = req.params;
  const { estatus, notasAdmin, prioridad } = req.body;
  
  try {
    const ticketActualizado = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: { estatus, notasAdmin, prioridad }
    });
    res.json(ticketActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar el ticket" });
  }
});

// ==========================================
// 📥 NUEVA RUTA: IMPORTACIÓN MASIVA DE CSV
// ==========================================
router.post('/clientes/importar', verificarToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo.' });
  }

  const resultados = [];
  
  // 1. Leer el archivo temporal
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => resultados.push(data))
    .on('end', async () => {
      try {
        let creados = 0;

        // 2. Iterar sobre cada fila del Excel/CSV
        for (const fila of resultados) {
          const { nombre, direccion, telefono, latitud, longitud, numCliente, ip, diaCobro, email, password, plan_nombre } = fila;

          // Validar si el cliente ya existe para evitar duplicados
          const clienteExistente = await prisma.cliente.findFirst({
            where: { numCliente: numCliente }
          });
          if (clienteExistente) continue; 

          // Buscar el paquete por nombre exacto en la base de datos
          const paquete = await prisma.paquete.findFirst({
            where: { nombre: plan_nombre }
          });
          const paqueteId = paquete ? paquete.id : null;
          const precioPaquete = paquete ? paquete.precio : 0;

          // A) Crear el Usuario para Login
          const nuevoUsuario = await prisma.usuario.create({
            data: {
              email: email || `${numCliente.toLowerCase()}@citynet.com`,
              password: password || '12345678', // Si usas bcrypt, agrégalo aquí
              rol: 'CLIENTE'
            }
          });

          // B) Crear el Cliente
          const nuevoCliente = await prisma.cliente.create({
            data: {
              nombre: nombre,
              direccion: direccion || '',
              telefono: telefono || '',
              latitud: latitud ? parseFloat(latitud) : null,
              longitud: longitud ? parseFloat(longitud) : null,
              numCliente: numCliente,
              diaCobro: parseInt(diaCobro) || 1,
              usuarioId: nuevoUsuario.id
            }
          });

          // C) Crear el Servicio vinculado al paquete
          if (paqueteId) {
            await prisma.servicio.create({
              data: {
                clienteId: nuevoCliente.id,
                paqueteId: paqueteId,
                precio: precioPaquete,
                direccionIp: ip || '',
                estado: 'ACTIVO'
              }
            });
          }
          creados++;
        }

        // 3. Eliminar el archivo CSV temporal del servidor
        fs.unlinkSync(req.file.path);

        res.json({ 
          mensaje: `¡Importación completada! Se guardaron ${creados} clientes nuevos en la base de datos.` 
        });

      } catch (error) {
        console.error("Error en la importación masiva con Prisma:", error);
        // Limpiar archivo si ocurre un error fatal
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Hubo un error al guardar los clientes en la base de datos.' });
      }
    });
});

// =================================================================
// MASTER CRON ENDPOINT: GENERACIÓN DE FACTURAS Y SUSPENSIONES
// =================================================================
router.get('/cron/procesar-dia', async (req, res) => {
  // 🔒 SEGURIDAD: Validar que la petición venga exclusivamente de Vercel
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "No autorizado" });
  }

  console.log('=== 🤖 INICIANDO TAREAS AUTOMÁTICAS DE MEDIANOCHE (VERCEL) ===');
  
  // Forzamos que los cálculos de día y mes utilicen la hora local de México 
  // para evitar desfases si el servidor de Vercel corre en otra región.
  const fechaMexico = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const diaActual = fechaMexico.getDate(); 
  
  const mesActual = fechaMexico.toLocaleString('es-MX', { month: 'long', timeZone: 'America/Mexico_City' }).toUpperCase();
  const añoActual = fechaMexico.getFullYear();
  const stringMesCorrespondiente = `${mesActual}-${añoActual}`; // Ej: "MAYO-2026"

  try {
    let resultadoFacturas = "No correspondía facturación hoy.";
    let resultadoSuspensiones = "No correspondía aplicar cortes hoy.";

    // -------------------------------------------------------------
    // TASK 1: GENERACIÓN AUTOMÁTICA DE FACTURAS (Días 1 y 15)
    // -------------------------------------------------------------
    if (diaActual === 1 || diaActual === 15) {
      console.log(`[CRON] Generando facturas automáticas para el Grupo del día ${diaActual}...`);
      
      const clientesDelGrupo = await prisma.cliente.findMany({
        where: { 
          diaCobro: diaActual,
          servicio: { estado: 'ACTIVO' } 
        },
        include: { servicio: true }
      });

      let facturasCreadas = 0;
      for (const cliente of clientesDelGrupo) {
        const facturaExiste = await prisma.factura.findFirst({
          where: {
            clienteId: cliente.id,
            mes: stringMesCorrespondiente
          }
        });

        if (!facturaExiste && cliente.servicio) {
          await prisma.factura.create({
            data: {
              clienteId: cliente.id,
              monto: cliente.servicio.precio,
              mes: stringMesCorrespondiente,
              estado: 'PENDIENTE',
              fechaEmision: new Date()
            }
          });
          facturasCreadas++;
        }
      }
      resultadoFacturas = `Facturas del Grupo ${diaActual} procesadas. Creadas: ${facturasCreadas}`;
      console.log(`✅ [CRON] ${resultadoFacturas}`);
    }

    // -------------------------------------------------------------
    // TASK 2: SUSPENSIÓN AUTOMÁTICA POR FALTA DE PAGO (Días 5 y 20)
    // -------------------------------------------------------------
    const DIAS_DE_CORTE = [5, 20]; 

    if (DIAS_DE_CORTE.includes(diaActual)) {
      const grupoACortar = diaActual === 5 ? 1 : 15;
      console.log(`[CRON] Revisando impagos para aplicar suspensiones al Grupo ${grupoACortar}...`);

      const facturasVencidas = await prisma.factura.findMany({
        where: {
          mes: stringMesCorrespondiente,
          estado: 'PENDIENTE',
          cliente: { diaCobro: grupoACortar }
        },
        include: { cliente: { include: { servicio: true } } }
      });

      let suspendidosContador = 0;
      
      if (facturasVencidas.length > 0) {
        // Mapeamos los IDs de los servicios vinculados a las facturas vencidas
        const servicioIds = facturasVencidas
          .filter(f => f.cliente?.servicio?.estado === 'ACTIVO')
          .map(f => f.cliente.servicio.id);

        if (servicioIds.length > 0) {
          // Actualización masiva optimizada
          const suspensiones = await prisma.servicio.updateMany({
            where: { id: { in: servicioIds } },
            data: { estado: 'SUSPENDIDO' }
          });
          suspendidosContador = suspensiones.count;
        }
      }
      
      resultadoSuspensiones = `Corte completado para el Grupo ${grupoACortar}. Suspendidos: ${suspendidosContador}`;
      console.log(`✅ [CRON] ${resultadoSuspensiones}`);
    }

    // Responder de forma exitosa a Vercel para cerrar la ejecución
    return res.json({
      success: true,
      fechaProcesada: fechaMexico.toISOString(),
      facturas: resultadoFacturas,
      suspensiones: resultadoSuspensiones
    });

  } catch (error) {
    console.error('❌ [CRON ERROR] Falló la ejecución de tareas:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;