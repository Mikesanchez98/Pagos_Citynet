const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken } = require('../middleware/auth');
const { verificarAdmin } = require('../middleware/auth');
const { enviarMensajeTwilio } = require('../services/whatsapp');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const csv = require('csv-parser');
const bcrypt = require('bcrypt');
const { validar, schemas } = require('../middleware/validar');

const axios = require('axios');
const SALT_ROUNDS = 10;
const fs = require('fs');

const upload = multer({ storage: multer.memoryStorage() });
const prisma = new PrismaClient();

// 1. Obtener todos los clientes
router.get('/clientes', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      include: { 
        usuario: true, 
        // ⚠️ ACTUALIZADO: Facturas cuelgan directamente del cliente
        facturas: { where: { pagada: false } },
        servicios: {
          // ⚠️ ACTUALIZADO: Traemos el paquete de cada servicio para ver de qué es
          include: { paquete: true }
        }
      }
    });
    res.json(clientes);
  } catch (error) {
    console.error("[Error Admin Clientes]:", error);
    res.status(500).json({ error: 'Error al obtener lista' });
  }
});

// 2. Obtener un cliente específico (Expediente)
router.get('/cliente/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuario: true, 
        facturas: true, // ⚠️ ACTUALIZADO: Cuelgan del cliente
        pagos: true,
        servicios: {
          include: {
            paquete: true, // ⚠️ ACTUALIZADO: Para mostrar el plan actual de la instalación
            torre: true
          }
        }
      }
    });

    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

    res.json(cliente);
  } catch (error) {
    console.error("Error GET Cliente:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/registrar-cliente
router.post('/registrar-cliente', verificarToken, verificarAdmin, validar(schemas.registrarCliente), async (req, res) => { 
  const { email, password, nombre, numCliente, paqueteId, ip, torreId, direccion, latitud, longitud, telefono } = req.body;

  try {
    const fechaActual = new Date();
    let diaRegistro = fechaActual.getDate(); 
    if (diaRegistro > 28) diaRegistro = 28;

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const resultado = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: { email, password: passwordHash, rol: 'CLIENTE' }
      });

      // ⚠️ ACTUALIZADO: Creación anidada. Los datos físicos se van al Servicio.
      const cliente = await tx.cliente.create({
        data: {
          nombre,
          numCliente,
          usuarioId: usuario.id,
          diaCobro: diaRegistro, 
          telefono: telefono || null,
          email: email, // Guardamos copia en el cliente si es necesario
          servicios: {
            create: [
              {
                direccionIp: ip,
                direccion: direccion || null,
                latitud: latitud ? parseFloat(latitud) : null,
                longitud: longitud ? parseFloat(longitud) : null,
                torreId: torreId ? parseInt(torreId) : null,
                paqueteId: paqueteId // Obligatorio conectar un paquete al servicio
              }
            ]
          }
        },
        include: { servicios: true }
      });

      return { usuario, cliente };
    });

    res.json({ mensaje: 'Cliente registrado con éxito', data: resultado });
  } catch (error) {
    console.error("Error al registrar:", error);
    res.status(500).json({ error: 'Error al registrar cliente' });
  }
});

// PATCH /api/admin/servicio/:id/estatus
router.patch('/servicio/:id/estatus', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body;

  if (!['ACTIVO', 'SUSPENDIDO'].includes(nuevoEstado)) {
    return res.status(400).json({ error: 'Estado inválido. Usa ACTIVO o SUSPENDIDO.' });
  }

  try {
    const servicio = await prisma.servicio.findUnique({
      where: { id: parseInt(id) },
      include: { cliente: true }
    });
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });

    const actualizado = await prisma.servicio.update({
      where: { id: parseInt(id) },
      data: { estado: nuevoEstado }
    });

    // Llamar a MikroTik solo si el servicio tiene usuario vinculado
    if (servicio.mikrotikUser) {
      const mikrotikService = require('../services/mikrotik');
      try {
        if (nuevoEstado === 'SUSPENDIDO') {
          await mikrotikService.suspenderUsuario(servicio.mikrotikUser);
        } else {
          await mikrotikService.reactivarUsuario(servicio.mikrotikUser);
        }
      } catch (mikrotikErr) {
        console.error(`[MikroTik] Error al ${nuevoEstado} "${servicio.mikrotikUser}":`, mikrotikErr.message);
        // No bloqueante: el estado en DB ya se actualizó
      }
    }

    res.json(actualizado);
  } catch (error) {
    console.error('Error al cambiar estado del servicio:', error);
    res.status(500).json({ error: 'No se pudo cambiar el estado' });
  }
});

// POST /api/admin/cliente/:id/generar-factura (⚠️ AHORA ES POR CLIENTE, NO POR SERVICIO)
router.post('/cliente/:id/generar-factura', verificarToken, verificarAdmin, async (req, res) => {
  const clienteId = parseInt(req.params.id);
  if (isNaN(clienteId)) return res.status(400).json({ error: 'ID de cliente inválido' });

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: { 
        servicios: { 
          where: { estado: "ACTIVO" },
          include: { paquete: true } 
        } 
      }
    });

    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    if (cliente.servicios.length === 0) return res.status(400).json({ error: 'El cliente no tiene servicios activos' });

    // 🧠 LÓGICA DE SUMA GLOBAL
    let totalACobrar = 0;
    cliente.servicios.forEach(servicio => {
      totalACobrar += servicio.paquete.precio;
    });

    // 🧠 LÓGICA DE DESCUENTO POR SALDO A FAVOR
    let montoFinalFactura = totalACobrar;
    let saldoRestanteCliente = cliente.saldo || 0;
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

    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    const [nuevaFactura] = await prisma.$transaction([
      prisma.factura.create({
        data: {
          monto: montoFinalFactura,
          vencimiento: fechaVencimiento,
          pagada: facturaPagada,
          clienteId: cliente.id // ⚠️ Se asigna al cliente global
        }
      }),
      prisma.cliente.update({
        where: { id: clienteId },
        data: { saldo: saldoRestanteCliente }
      })
    ]);

    console.log(`✅ Factura global generada por $${montoFinalFactura}. Saldo restante: $${saldoRestanteCliente}`);
    res.status(200).json({ msg: 'Factura generada exitosamente', factura: nuevaFactura });

  } catch (error) {
    console.error('❌ Error al generar factura global:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/admin/servicio/:id/generar-factura (🟢 NUEVA: FACTURACIÓN INDIVIDUAL)
router.post('/servicio/:id/generar-factura', verificarToken, verificarAdmin, async (req, res) => {
  const servicioId = parseInt(req.params.id);
  if (isNaN(servicioId)) return res.status(400).json({ error: 'ID de servicio inválido' });

  try {
    // 1. Buscamos el servicio específico junto con su paquete y el cliente dueño
    const servicio = await prisma.servicio.findUnique({
      where: { id: servicioId },
      include: { 
        paquete: true,
        cliente: true // Necesitamos al cliente para ver su saldo y asignarle la factura
      }
    });

    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
    if (servicio.estado !== "ACTIVO") return res.status(400).json({ error: 'No se puede facturar un servicio suspendido' });

    // 2. El total a cobrar es únicamente el precio de este paquete
    const totalACobrar = servicio.paquete.precio;

    // 3. Lógica de descuento por saldo a favor del cliente
    let montoFinalFactura = totalACobrar;
    let saldoRestanteCliente = servicio.cliente.saldo || 0;
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

    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    // 4. Guardamos en la base de datos de forma segura
    const [nuevaFactura] = await prisma.$transaction([
      prisma.factura.create({
        data: {
          monto: montoFinalFactura,
          vencimiento: fechaVencimiento,
          pagada: facturaPagada,
          clienteId: servicio.cliente.id, // Se sigue asignando al cliente para su historial
          // 💡 NOTA: Si en tu modelo 'Factura' tienes un campo 'servicioId', puedes agregarlo aquí:
          // servicioId: servicio.id 
        }
      }),
      prisma.cliente.update({
        where: { id: servicio.cliente.id },
        data: { saldo: saldoRestanteCliente }
      })
    ]);

    console.log(`✅ Factura individual generada para el servicio #${servicio.id} por $${montoFinalFactura}.`);
    res.status(200).json({ msg: 'Factura del servicio generada exitosamente', factura: nuevaFactura });

  } catch (error) {
    console.error('❌ Error al generar factura individual:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST: Agregar un NUEVO servicio a un cliente existente
router.post('/cliente/:id/servicio', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params; // Este es el ID del cliente dueño
  const { direccion, ip, torreId, latitud, longitud, paqueteId } = req.body;

  try {
    // Verificamos que el cliente exista
    const clienteExiste = await prisma.cliente.findUnique({
      where: { id: parseInt(id) }
    });

    if (!clienteExiste) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    // Creamos el nuevo servicio y lo enlazamos al cliente
    const nuevoServicio = await prisma.servicio.create({
      data: {
        clienteId: parseInt(id), // 🔗 Aquí hacemos la magia de la conexión
        paqueteId: paqueteId,    // 📦 El ID del plan que eligió
        direccion: direccion || null,
        direccionIp: ip || null,
        torreId: torreId ? parseInt(torreId) : null,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
      }
    });

    res.json({ mensaje: "Nuevo servicio agregado con éxito", nuevoServicio });
  } catch (error) {
    console.error("Error al agregar servicio extra:", error);
    res.status(500).json({ error: "Error interno al registrar el nuevo servicio" });
  }
});

// PUT RUTA PARA ACTUALIZAR CLIENTE
router.put('/cliente/:id', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, paqueteId, ip, diaCobro, torreId, direccion, latitud, longitud, telefono, email, password } = req.body;

  try {
    let datosUsuario = { email: email }; 
    if (password && password.trim() !== "") {
      datosUsuario.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    // ⚠️ ACTUALIZADO: Encontramos su primer servicio para actualizarlo
    // (Mientras terminas la interfaz para editar múltiples servicios)
    const primerServicio = await prisma.servicio.findFirst({
      where: { clienteId: parseInt(id) }
    });

    const clienteActualizado = await prisma.$transaction(async (tx) => {
      // 1. Actualizamos los datos directos del cliente
      const cliente = await tx.cliente.update({
        where: { id: parseInt(id) },
        data: {
          nombre: nombre,
          diaCobro: diaCobro ? parseInt(diaCobro) : null,
          telefono: telefono || null,
          usuario: { update: datosUsuario }
        }
      });

      // 2. Actualizar o crear el servicio según corresponda
      if (primerServicio) {
        // Servicio existente: actualizar campos
        await tx.servicio.update({
          where: { id: primerServicio.id },
          data: {
            direccionIp: ip || null,
            direccion: direccion || null,
            latitud: latitud !== '' && latitud !== null && latitud !== undefined ? parseFloat(latitud) : null,
            longitud: longitud !== '' && longitud !== null && longitud !== undefined ? parseFloat(longitud) : null,
            paqueteId: paqueteId || undefined,
            torreId: torreId ? parseInt(torreId) : null
          }
        });
      } else if (paqueteId) {
        // Cliente sin servicio y se proporcionó un plan: crear el primer servicio
        await tx.servicio.create({
          data: {
            clienteId: parseInt(id),
            direccionIp: ip || null,
            direccion: direccion || null,
            latitud: latitud !== '' && latitud !== null && latitud !== undefined ? parseFloat(latitud) : null,
            longitud: longitud !== '' && longitud !== null && longitud !== undefined ? parseFloat(longitud) : null,
            paqueteId: paqueteId,
            torreId: torreId ? parseInt(torreId) : null,
            estado: 'ACTIVO'
          }
        });
      }
      return cliente;
    });

    res.json({ mensaje: "Cliente actualizado con éxito", clienteActualizado });
  } catch (error) {
    console.error("Error al editar:", error);
    res.status(500).json({ error: "Error interno al intentar actualizar el cliente" });
  }
});

// Marcar factura como pagada manualmente
router.patch('/factura/:id/pagar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id === 'undefined') return res.status(400).send("ID inválido");
    const idNumero = parseInt(id);
    if (isNaN(idNumero)) return res.status(400).send("El ID debe ser un número");

    const factura = await prisma.factura.findUnique({
      where: { id: idNumero }
    });

    if (!factura) return res.status(404).send("Factura no encontrada");

    await prisma.factura.update({
      where: { id: idNumero },
      data: { pagada: true }
    });

    await prisma.pago.create({
      data: {
        clienteId: factura.clienteId, // ⚠️ ACTUALIZADO: Se toma directo de la factura
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
router.delete('/factura/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    await prisma.factura.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ mensaje: "Factura eliminada" });
  } catch (error) {
    res.status(500).json({ error: "No se pudo eliminar" });
  }
});

// Eliminar cliente (en cascada)
router.delete('/clientes/:id', verificarToken, verificarAdmin, async (req, res) => {
  const clienteId = parseInt(req.params.id);

  try{
    await prisma.$transaction(async (tx) => {
      // 1. Borrar facturas vinculadas a este cliente (⚠️ ACTUALIZADO)
      await tx.factura.deleteMany({
        where: { clienteId: clienteId }
      });
      // 2. Borrar pagos vinculados (Previniendo errores de llave foránea)
      await tx.pago.deleteMany({
        where: { clienteId: clienteId }
      });
      // 3. Borrar los servicios
      await tx.servicio.deleteMany({
        where: { clienteId: clienteId }
      });
      // 4. Borrar el cliente (y su usuario, si tienes onDelete Cascade, si no, bórralo explícito)
      await tx.cliente.delete({
        where: { id: clienteId }
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
      include: { 
        servicios: {
          where: { estado: 'ACTIVO' },
          include: { paquete: true }
        }
      }
    });

    let facturasGeneradas = 0;

    for (const cliente of clientesDelGrupo) {
      if (cliente.servicios.length === 0) continue; // Si no tiene servicios activos, lo saltamos

      let totalGlobal = 0;
      cliente.servicios.forEach(servicio => {
        totalGlobal += servicio.paquete.precio;
      });

      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 5);

      await prisma.factura.create({
        data: {
          clienteId: cliente.id, // ⚠️ ACTUALIZADO: Factura atada a la cuenta global
          monto: totalGlobal,
          vencimiento: fechaVencimiento,
          pagada: false
        }
      });
      facturasGeneradas++;
    }

    res.json({
      mensaje: `Proceso completado. Se generaron ${facturasGeneradas} facturas globales para el grupo del dia ${diaCobro}.`
    });

  } catch (error) {
    console.error("❌ [Error Prisma en generar facturas por lote]:", error.message || error);
    res.status(500).json({ error: "Error interno al generar facturas por lote" });
  }
});

// ==========================================
// RUTAS DE TORRES
// ==========================================
// OBTENER LAS TORRES
router.get('/torres', verificarToken, async (req, res) => {
  try {
    // ⚠️ ACTUALIZADO: La torre ahora se conecta a los servicios, y a través del servicio llegamos al cliente y su paquete
    const torres = await prisma.torre.findMany({
      include: { 
        servicios: {
          include: { 
            cliente: true,
            paquete: true
          }
        } 
      }
    });
    res.json(torres);
  } catch (error) {
    console.error("Error al obtener torres:", error);
    res.status(500).json({ error: "Error al obtener torres" });
  }
});

// CREAR UNA NUEVA TORRE
router.post('/torres', verificarToken, verificarAdmin, async (req, res) => {
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

router.put('/torres/:id', verificarToken, verificarAdmin, async (req, res) => {
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

// ==========================================
// RUTAS DE PAGOS
// ==========================================
// Registrar Nuevo Pago (Desde panel general)
router.post('/pagos', verificarToken, verificarAdmin, validar(schemas.registrarPago), async (req, res) => {
  const { clienteId, monto, mesCorrespondiente, metodoPago, notas } = req.body;

  try {
    let saldoRestante = parseFloat(monto);

    const nuevoPago = await prisma.pago.create({
      data: {
        clienteId: parseInt(clienteId), 
        monto: parseFloat(monto),
        mesCorrespondiente: mesCorrespondiente || '',
        metodoPago: metodoPago || 'Efectivo',
        notas: notas || ''
      }
    });

    // ⚠️ ACTUALIZADO: Buscamos facturas directamente en el cliente
    const facturasPendientes = await prisma.factura.findMany({
      where: {
        clienteId: parseInt(clienteId),
        pagada: false
      },
      orderBy: { vencimiento: 'asc' }
    });

    for (const factura of facturasPendientes) {
      if (saldoRestante <= 0) break;

      const montoFactura = parseFloat(factura.monto);

      if (saldoRestante >= montoFactura) {
        await prisma.factura.update({
          where: { id: factura.id },
          data: { pagada: true }
        });
        saldoRestante -= montoFactura;
      } else {
        await prisma.factura.update({
          where: { id: factura.id },
          data: { monto: montoFactura - saldoRestante }
        });
        saldoRestante = 0; 
        break; 
      }
    }

    if (saldoRestante > 0) {
      await prisma.cliente.update({
        where: { id: parseInt(clienteId) },
        data: { saldo: { increment: saldoRestante } }
      });
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

// Historial general de pagos
router.get('/pagos/historial', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { filtro } = req.query; 
    const ahora = new Date();
    let fechaInicio = new Date(0); 

    if (filtro === 'HOY') {
      fechaInicio = new Date(ahora.setHours(0, 0, 0, 0));
    } else if (filtro === 'SEMANA') {
      const diaSemana = ahora.getDay();
      const diff = ahora.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1); 
      fechaInicio = new Date(ahora.setDate(diff));
      fechaInicio.setHours(0, 0, 0, 0);
    } else if (filtro === 'MES') {
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    }

    const pagos = await prisma.pago.findMany({
      where: filtro !== 'TODOS' ? { fecha: { gte: fechaInicio } } : {},
      include: { cliente: { select: { nombre: true } } },
      orderBy: { fecha: 'desc' }
    });

    res.json(pagos);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar los pagos." });
  }
});

// Obtener el historial de pagos de un cliente específico
router.get('/pagos/:clienteId', verificarToken, verificarAdmin, async (req, res) => {
  const { clienteId } = req.params;
  try {
    const historial = await prisma.pago.findMany({
      where: { clienteId: parseInt(clienteId) },
      orderBy: { fecha: 'desc' }
    });
    res.json(historial);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener historial de pagos" });
  }
});

// --- RUTA DE ESTADÍSTICAS (Logistica) ---
router.get('/dashboard-stats', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const totalClientes = await prisma.cliente.count();
    
    // ⚠️ ACTUALIZADO: Incluimos el paquete para acceder al precio del plan
    const servicios = await prisma.servicio.findMany({
      include: { paquete: true }
    });
    
    const activos = servicios.filter(s => s.estado === 'ACTIVO').length;
    const suspendidos = servicios.filter(s => s.estado === 'SUSPENDIDO').length;

    // ⚠️ ACTUALIZADO: Sumamos el precio del paquete asignado a cada servicio activo
    const ingresosProyectados = servicios
      .filter(s => s.estado === 'ACTIVO')
      .reduce((sum, s) => sum + Number(s.paquete?.precio || 0), 0);

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

// Generacion de pdf (Pago)
router.get('/pago/:id/pdf', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pago = await prisma.pago.findUnique({
      where: { id: parseInt(id) },
      // ⚠️ ACTUALIZADO: Traemos el primer servicio del cliente solo para mostrar su dirección si hace falta
      include: {
        cliente: { include: { servicios: true } }
      }
    });

    if (!pago) return res.status(404).json({ error: "Pago no encontrado" });

    // (El resto del código de diseño de PDFKit se mantiene exactamente igual, ya que no depende de las relaciones de servicio)
    const doc = new PDFDocument({ size: 'A6', margin: 30 }); 
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo_citynet_${pago.id}.pdf`);
    doc.pipe(res);

    doc.fillColor('#1e293b').fontSize(16).text('CITYNET', { align: 'center', weight: 'bold' });
    doc.fontSize(8).text('Internet de Alta Velocidad', { align: 'center' });
    doc.moveDown();
    doc.moveTo(30, doc.y).lineTo(250, doc.y).stroke('#e2e8f0');
    doc.moveDown();

    doc.fillColor('#64748b').fontSize(8).text('CLIENTE:');
    doc.fillColor('#000000').fontSize(10).text(pago.cliente.nombre.toUpperCase());
    // ⚠️ ACTUALIZADO: Tomamos la dirección del primer servicio (si existe)
    const direccionServicio = pago.cliente.servicios[0]?.direccion || 'No especificada';
    doc.fontSize(8).text(`Dirección: ${direccionServicio}`);
    doc.moveDown();

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

    doc.moveDown(4);
    doc.fontSize(12).fillColor('#10b981').text(`TOTAL PAGADO: $${pago.monto}`, { align: 'right' });
    doc.moveDown(2);
    doc.fillColor('#94a3b8').fontSize(7).text('Gracias por su preferencia.', { align: 'center' });
    doc.text('Citynet - Conectando tu mundo', { align: 'center' });
    doc.end();

  } catch (error) {
    res.status(500).json({ error: "Error al generar el recibo" });
  }
});

// Registrar un pago desde el detalle del cliente
router.post('/cliente/:id/pagar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { monto } = req.body;
    let saldoRestante = Number(monto);

    const nuevoPago = await prisma.pago.create({
      data: {
        monto: Number(monto),
        fecha: new Date(),
        clienteId: parseInt(id),
        mesCorrespondiente: 'Pago Directo',
        metodoPago: 'Efectivo'
      }
    });

    // ⚠️ ACTUALIZADO: Buscar las facturas directamente en el cliente
    const facturasPendientes = await prisma.factura.findMany({
      where: {
        clienteId: parseInt(id),
        pagada: false
      },
      orderBy: { vencimiento: 'asc' }
    });

    for (const factura of facturasPendientes) {
      if (saldoRestante <= 0) break;
      const montoFactura = parseFloat(factura.monto);
      if (saldoRestante >= montoFactura) {
        await prisma.factura.update({
          where: { id: factura.id },
          data: { pagada: true }
        });
        saldoRestante -= montoFactura;
      } else {
        await prisma.factura.update({
          where: { id: factura.id },
          data: { monto: montoFactura - saldoRestante }
        });
        saldoRestante = 0;
        break;
      }
    }

    if (saldoRestante > 0) {
      await prisma.cliente.update({
        where: { id: parseInt(id) },
        data: { saldo: { increment: saldoRestante } }
      });
    }

    res.json({ 
      message: saldoRestante > 0 
        ? `Pago registrado y saldo a favor de $${saldoRestante} guardado` 
        : "Pago registrado y facturas actualizadas con éxito", 
      nuevoPago 
    });

  } catch (error) {
    res.status(500).json({ error: "Error al registrar el pago" });
  }
});

// CANCELAR UN PAGO REALIZADO (CASCADA INVERSA)
router.post('/pagos/:id/cancelar', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const pago = await prisma.pago.findUnique({
      where: { id: parseInt(id) }
    });
    if (!pago) return res.status(404).json({ error: "El registro de pago no existe." });

    let montoARevertir = Number(pago.monto);

    // ⚠️ ACTUALIZADO: Consultar facturas directo al cliente
    const facturasPagadas = await prisma.factura.findMany({
      where: {
        clienteId: pago.clienteId,
        pagada: true
      },
      orderBy: { vencimiento: 'desc' } 
    });

    for (const factura of facturasPagadas) {
      if (montoARevertir <= 0) break;
      await prisma.factura.update({
        where: { id: factura.id },
        data: { pagada: false }
      });
      montoARevertir -= Number(factura.monto);
    }

    if (montoARevertir > 0) {
      await prisma.cliente.update({
        where: { id: pago.clienteId },
        data: { saldo: { decrement: montoARevertir } }
      });
    }

    await prisma.pago.delete({ where: { id: parseInt(id) } });
    return res.json({ success: true, mensaje: "Pago cancelado y facturas reabiertas exitosamente." });

  } catch (error) {
    return res.status(500).json({ error: "No se pudo procesar la cancelación del pago." });
  }
});

// Ruta para descargar/ver el PDF de una factura
router.get('/factura/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    // ⚠️ ACTUALIZADO: Factura -> Cliente -> Servicios -> Paquete
    const factura = await prisma.factura.findUnique({
      where: { id: parseInt(id) },
      include: {
        cliente: {
          include: {
            servicios: {
              include: { paquete: true }
            }
          }
        }
      }
    });

    if (!factura) return res.status(404).send("Factura no encontrada");

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Factura_${factura.id}_${factura.cliente.nombre.replace(/\s+/g, '_')}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text('CITYNET PAGOS', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Comprobante de Servicio de Internet', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Bold').text('Detalles del Recibo', { underline: true });
    doc.moveDown(0.5);
    // ⚠️ ACTUALIZADO: Cambié fechaEmision por el campo vencimiento de tu esquema
    doc.fontSize(12).font('Helvetica')
       .text(`Folio de Factura: #${factura.id}`)
       .text(`Fecha de Vencimiento: ${new Date(factura.vencimiento).toLocaleDateString()}`)
       .text(`Estado: ${factura.pagada ? 'PAGADA' : 'PENDIENTE'}`);
    doc.moveDown();

    const primerServicio = factura.cliente.servicios[0]; // Usamos el primer servicio para los detalles físicos
    
    doc.fontSize(14).font('Helvetica-Bold').text('Datos del Cliente', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica')
       .text(`Nombre: ${factura.cliente.nombre}`)
       .text(`Dirección: ${primerServicio?.direccion || 'N/A'}`)
       .text(`Plan Principal: ${primerServicio?.paquete?.nombre || 'N/A'}`)
       .text(`IP Asignada: ${primerServicio?.direccionIp || 'N/A'}`);
    doc.moveDown(2);

    doc.fontSize(16).font('Helvetica-Bold').text(`Monto Total: $${factura.monto}`, { align: 'right' });
    doc.moveDown(4);
    doc.fontSize(10).font('Helvetica-Oblique').text('Gracias por su preferencia.', { align: 'center' });
    doc.end();

  } catch (error) {
    res.status(500).send("Error al generar el documento PDF");
  }
});

// ==========================================
// 🛠️ MÓDULO DE SOPORTE TÉCNICO (TICKETS)
// ==========================================
// (El módulo de tickets se mantiene idéntico, ya que su relación con Cliente no cambió)
router.get('/tickets', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({
      include: { cliente: { select: { nombre: true, telefono: true } } }, // Quité direccion porque ahora está en servicio, pero no hace falta en la lista global
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los tickets" });
  }
});

router.post('/cliente/:id/tickets', async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, prioridad } = req.body;
  try {
    const nuevoTicket = await prisma.ticket.create({
      data: { titulo, descripcion, prioridad: prioridad || 'MEDIA', clienteId: parseInt(id) }
    });
    res.json(nuevoTicket);
  } catch (error) {
    res.status(500).json({ error: "Error al crear el ticket" });
  }
});

router.put('/tickets/:id', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;
  const { estatus, notasAdmin, prioridad } = req.body;
  try {
    const ticketActualizado = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: { estatus, notasAdmin, prioridad }
    });
    res.json(ticketActualizado);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar el ticket" });
  }
});

// ==========================================
// 📥 IMPORTACIÓN MASIVA DE CSV
// ==========================================
router.post('/clientes/importar', verificarToken, verificarAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });

  const { Readable } = require('stream');
  const resultados = [];

  const stream = Readable.from(req.file.buffer.toString('utf-8').split('\n').join('\n'));

  stream
    .pipe(csv())
    .on('data', (data) => resultados.push(data))
    .on('end', async () => {
      try {
        let creados = 0;
        let omitidos = 0;
        for (const fila of resultados) {
          const { nombre, direccion, telefono, latitud, longitud, numCliente, ip, diaCobro, email, password, plan_nombre } = fila;

          if (!numCliente) continue;

          const clienteExistente = await prisma.cliente.findFirst({ where: { numCliente: numCliente } });
          if (clienteExistente) { omitidos++; continue; }

          const paquete = plan_nombre ? await prisma.paquete.findFirst({ where: { nombre: plan_nombre } }) : null;
          const paqueteId = paquete?.id || null;

          const passwordPlana = password || '12345678';
          const passwordHash = await bcrypt.hash(passwordPlana, SALT_ROUNDS);

          const emailFinal = email || `${numCliente.toLowerCase()}@citynet.local`;

          const emailExiste = await prisma.usuario.findUnique({ where: { email: emailFinal } });
          if (emailExiste) { omitidos++; continue; }

          const nuevoUsuario = await prisma.usuario.create({
            data: { email: emailFinal, password: passwordHash, rol: 'CLIENTE' }
          });

          await prisma.cliente.create({
            data: {
              nombre: nombre || numCliente,
              numCliente: numCliente,
              telefono: telefono || null,
              email: emailFinal,
              diaCobro: parseInt(diaCobro) || 1,
              usuarioId: nuevoUsuario.id,
              servicios: paqueteId ? {
                create: [{
                  paqueteId: paqueteId,
                  direccionIp: ip || null,
                  direccion: direccion || null,
                  latitud: latitud ? parseFloat(latitud) : null,
                  longitud: longitud ? parseFloat(longitud) : null,
                  estado: 'ACTIVO'
                }]
              } : undefined
            }
          });
          creados++;
        }
        res.json({ mensaje: `¡Importación completada! ${creados} clientes nuevos, ${omitidos} omitidos (ya existían o sin datos).` });
      } catch (error) {
        console.error('Error al importar CSV:', error);
        res.status(500).json({ error: 'Error al guardar los clientes. Verifica que las columnas del CSV sean correctas.' });
      }
    })
    .on('error', (err) => {
      console.error('Error al leer CSV:', err);
      res.status(500).json({ error: 'Error al procesar el archivo CSV.' });
    });
});

// =================================================================
// MASTER CRON ENDPOINT: GENERACIÓN DE FACTURAS Y SUSPENSIONES
// =================================================================
router.get('/cron/procesar-dia', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const fechaMexico = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const diaActual = fechaMexico.getDate(); 
  
  try {
    // -------------------------------------------------------------
    // TASK 1: GENERACIÓN AUTOMÁTICA DE FACTURAS GLOBALES
    // -------------------------------------------------------------
    const clientesDelGrupo = await prisma.cliente.findMany({
      where: { 
        diaCobro: diaActual,
        servicios: { some: { estado: 'ACTIVO' } }
      },
      include: { 
        servicios: { 
          where: { estado: 'ACTIVO' },
          include: { paquete: true } // ⚠️ ACTUALIZADO: Extraer los precios
        } 
      }
    });

    let facturasCreadas = 0;
    
    // Calculamos inicio y fin del mes actual para ver si ya le cobramos
    const inicioMes = new Date(fechaMexico.getFullYear(), fechaMexico.getMonth(), 1);
    const finMes = new Date(fechaMexico.getFullYear(), fechaMexico.getMonth() + 1, 0);

    for (const cliente of clientesDelGrupo) {
      // ⚠️ ACTUALIZADO: Checamos si ya tiene factura en este mes (usando vencimiento en lugar del campo 'mes' que ya no existe)
      const facturaExiste = await prisma.factura.findFirst({
        where: {
          clienteId: cliente.id,
          vencimiento: { gte: inicioMes, lte: new Date(finMes.setDate(finMes.getDate() + 5)) }
        }
      });

      if (!facturaExiste && cliente.servicios.length > 0) {
        let montoTotal = 0;
        cliente.servicios.forEach(s => montoTotal += s.paquete.precio);

        const fechaVencimiento = new Date(fechaMexico);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 5);

        await prisma.factura.create({
          data: {
            clienteId: cliente.id,
            monto: montoTotal,
            vencimiento: fechaVencimiento,
            pagada: false
          }
        });
        facturasCreadas++;
      }
    }

    // -------------------------------------------------------------
    // TASK 2: SUSPENSIÓN AUTOMÁTICA POR FALTA DE PAGO
    // -------------------------------------------------------------
    let grupoACortar = diaActual - 4;
    if (grupoACortar <= 0) grupoACortar = 28 + grupoACortar; 

    // ⚠️ ACTUALIZADO: Buscar las facturas pendientes asociadas al cliente de ese grupo
    const facturasVencidas = await prisma.factura.findMany({
      where: {
        pagada: false,
        vencimiento: { lt: fechaMexico }, // Que su fecha de vencimiento ya haya pasado
        cliente: { diaCobro: grupoACortar }
      },
      include: { cliente: { include: { servicios: true } } }
    });

    let suspendidosContador = 0;
    
    if (facturasVencidas.length > 0) {
      const servicioIds = [];
      for (const factura of facturasVencidas) {
        if (factura.cliente?.servicios) {
          for (const s of factura.cliente.servicios) {
            if (s.estado === 'ACTIVO') servicioIds.push(s.id);
          }
        }
      }

      if (servicioIds.length > 0) {
        const suspensiones = await prisma.servicio.updateMany({
          where: { id: { in: servicioIds } },
          data: { estado: 'SUSPENDIDO' }
        });
        suspendidosContador = suspensiones.count;
      }
    }
    
    return res.json({
      success: true,
      fechaProcesada: fechaMexico.toISOString(),
      facturas: `Facturas creadas: ${facturasCreadas}`,
      suspensiones: `Corte Grupo ${grupoACortar}. Suspendidos: ${suspendidosContador}`
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// RUTAS DE COBRANZA MASIVA (TWILIO)
// ==========================================
router.post('/cobranza/enviar-individual', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { clienteId } = req.body;
    if (!clienteId) return res.status(400).json({ error: 'Falta el ID del cliente' });

    // ⚠️ ACTUALIZADO: Consultar facturas directamente en el cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(clienteId) },
      include: { facturas: { where: { pagada: false } } }
    });

    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const montoDeuda = cliente.facturas.reduce((acc, f) => acc + Number(f.monto || 0), 0);
    await enviarMensajeTwilio(cliente, montoDeuda.toFixed(2));
    
    return res.status(200).json({ success: true, message: 'Aviso enviado correctamente' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al enviar el mensaje por WhatsApp' });
  }
});

router.post('/cobranza/enviar-masivo', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { clientesIds } = req.body; 
    if (!clientesIds || !Array.isArray(clientesIds) || clientesIds.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs inválida o vacía' });
    }

    const clientes = await prisma.cliente.findMany({
      where: { id: { in: clientesIds.map(id => parseInt(id)) } },
      include: { facturas: { where: { pagada: false } } }
    });

    let exitosos = 0;
    let fallidos = 0;

    for (const cliente of clientes) {
      try {
        if (cliente.facturas.length === 0) continue; 
        const montoDeuda = cliente.facturas.reduce((acc, f) => acc + Number(f.monto || 0), 0);
        await enviarMensajeTwilio(cliente, montoDeuda.toFixed(2));
        exitosos++;
      } catch (err) {
        fallidos++;
      }
    }

    return res.status(200).json({ 
      success: true, 
      resultados: { total: clientes.length, exitosos, fallidos }
    });

  } catch (error) {
    return res.status(500).json({ error: 'Error procesando el lote masivo' });
  }
});

// ==========================================
// 📡 INTEGRACIÓN MIKROTIK
// ==========================================

// POST /api/admin/mikrotik/importar
// Jala todos los PPPoE secrets del router y los vincula a Servicios existentes.
// Regla de vinculación: Servicio.cliente.numCliente === secret.name (case-insensitive).
// Si el servicio ya tiene mikrotikUser, solo actualiza el estado (disabled).
router.post('/mikrotik/importar', verificarToken, verificarAdmin, async (req, res) => {
  const mikrotikSvc = require('../services/mikrotik');

  try {
    const usuarios = await mikrotikSvc.obtenerUsuariosPPPoE();

    if (!usuarios || usuarios.length === 0) {
      return res.status(502).json({ error: 'No se obtuvieron usuarios de MikroTik. Verifica la conexión.' });
    }

    let yaVinculados = 0;
    let vinculados   = 0;
    let sinCliente   = 0;
    const problemas  = [];

    for (const u of usuarios) {
      const mikrotikUser = u.name;
      if (!mikrotikUser) continue;

      try {
        // ¿Ya existe un Servicio con este mikrotikUser?
        const servicioExistente = await prisma.servicio.findUnique({
          where: { mikrotikUser }
        });

        if (servicioExistente) {
          // Solo sincronizar el estado disabled → SUSPENDIDO / ACTIVO
          await prisma.servicio.update({
            where: { id: servicioExistente.id },
            data: { estado: u.disabled ? 'SUSPENDIDO' : 'ACTIVO' }
          });
          yaVinculados++;
          continue;
        }

        // Buscar cliente cuyo numCliente coincida (exacto o uppercase)
        const clienteLocal = await prisma.cliente.findFirst({
          where: {
            OR: [
              { numCliente: mikrotikUser },
              { numCliente: mikrotikUser.toUpperCase() },
              { numCliente: mikrotikUser.toLowerCase() }
            ]
          },
          include: { servicios: true }
        });

        if (!clienteLocal) {
          sinCliente++;
          problemas.push({ name: mikrotikUser, razon: 'No se encontró cliente con ese numCliente' });
          continue;
        }

        // Buscar el primer servicio del cliente sin mikrotikUser asignado
        const servicioSinVincular = clienteLocal.servicios.find(s => !s.mikrotikUser)
          ?? clienteLocal.servicios[0];

        if (!servicioSinVincular) {
          sinCliente++;
          problemas.push({ name: mikrotikUser, razon: 'El cliente no tiene ningún servicio' });
          continue;
        }

        // Vincular
        await prisma.servicio.update({
          where: { id: servicioSinVincular.id },
          data: {
            mikrotikUser,
            estado: u.disabled ? 'SUSPENDIDO' : 'ACTIVO'
          }
        });
        vinculados++;

      } catch (err) {
        problemas.push({ name: mikrotikUser, razon: err.message });
      }
    }

    res.json({
      mensaje:      'Importación desde MikroTik completada',
      totalMikrotik: usuarios.length,
      yaVinculados,
      vinculados,
      sinCliente,
      problemas:    problemas.slice(0, 30)
    });
  } catch (error) {
    console.error('[MikroTik importar]:', error.message);
    res.status(500).json({ error: 'Error al importar desde MikroTik', detalle: error.message });
  }
});

// GET /api/admin/mikrotik/estado
// Verifica la conexión con el router y devuelve servicios vinculados vs total
router.get('/mikrotik/estado', verificarToken, verificarAdmin, async (req, res) => {
  const mikrotikSvc = require('../services/mikrotik');
  try {
    const health = await mikrotikSvc.healthCheck();

    const [totalServicios, vinculados] = await Promise.all([
      prisma.servicio.count(),
      prisma.servicio.count({ where: { mikrotikUser: { not: null } } })
    ]);

    res.json({
      conexion:       health,
      totalServicios,
      vinculados,
      sinVincular:    totalServicios - vinculados
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar estado de MikroTik' });
  }
});

// PATCH /api/admin/mikrotik/vincular
// Vincula manualmente un mikrotikUser a un Servicio específico
router.patch('/mikrotik/vincular', verificarToken, verificarAdmin, async (req, res) => {
  const { servicioId, mikrotikUser } = req.body;
  if (!servicioId || !mikrotikUser) {
    return res.status(400).json({ error: 'servicioId y mikrotikUser son requeridos' });
  }
  try {
    const servicio = await prisma.servicio.update({
      where: { id: parseInt(servicioId) },
      data:  { mikrotikUser }
    });
    res.json({ mensaje: 'Vínculo establecido', servicio });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: `El usuario "${mikrotikUser}" ya está vinculado a otro servicio` });
    }
    res.status(500).json({ error: 'Error al vincular' });
  }
});

// GET /api/admin/mikrotik/interfaces
// Retorna los interfaces del router con sus IPs: base para crear Antenas
router.get('/mikrotik/interfaces', verificarToken, verificarAdmin, async (req, res) => {
  const mikrotikSvc = require('../services/mikrotik');
  try {
    const [interfaces, ips] = await Promise.all([
      mikrotikSvc.obtenerInterfaces(),
      mikrotikSvc.obtenerIPAddresses()
    ]);

    // Unir cada interface con su IP/subred
    const resultado = interfaces.map(iface => {
      const ipInfo = ips.find(ip => ip.interface === iface.name);
      let subred = null;
      let ipGateway = null;

      if (ipInfo) {
        const [addr, prefijo] = ipInfo.address.split('/');
        ipGateway = addr;
        // Calcular dirección de red
        const ipToInt = s => s.split('.').reduce((acc, n) => ((acc << 8) | parseInt(n)) >>> 0, 0);
        const intToIp = n => [24, 16, 8, 0].map(b => (n >> b) & 0xFF).join('.');
        const mask = prefijo === '0' ? 0 : (0xFFFFFFFF << (32 - parseInt(prefijo))) >>> 0;
        const network = intToIp(ipToInt(addr) & mask);
        subred = `${network}/${prefijo}`;
      }

      return {
        nombre:      iface.name,
        tipo:        iface.type,
        activa:      iface.running,
        ipGateway,
        subred,
        comentario:  iface.comment
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error('[MikroTik interfaces]:', error.message);
    res.status(500).json({ error: 'Error al obtener interfaces de MikroTik', detalle: error.message });
  }
});

// POST /api/admin/mikrotik/crear-antenas
// Crea/actualiza Antenas en la BD a partir de interfaces seleccionadas del MikroTik
router.post('/mikrotik/crear-antenas', verificarToken, verificarAdmin, async (req, res) => {
  const { torreId, interfaces } = req.body;
  // interfaces = [{ nombre, ipGateway, subred, tipo, activa, comentario }]

  if (!torreId || !Array.isArray(interfaces) || interfaces.length === 0) {
    return res.status(400).json({ error: 'torreId e interfaces son requeridos' });
  }

  const torre = await prisma.torre.findUnique({ where: { id: parseInt(torreId) } });
  if (!torre) return res.status(404).json({ error: 'Torre no encontrada' });

  const creadas = [];
  const actualizadas = [];
  const errores = [];

  for (const iface of interfaces) {
    try {
      const antenaExistente = await prisma.antena.findFirst({
        where: { OR: [{ interfaceName: iface.nombre }, { nombre: iface.nombre }], torreId: parseInt(torreId) }
      });

      if (antenaExistente) {
        await prisma.antena.update({
          where: { id: antenaExistente.id },
          data: {
            ipGateway:     iface.ipGateway || antenaExistente.ipGateway,
            subred:        iface.subred    || antenaExistente.subred,
            interfaceName: iface.nombre,
            tipoInterfaz:  iface.tipo,
            activa:        iface.activa
          }
        });
        actualizadas.push(iface.nombre);
      } else {
        await prisma.antena.create({
          data: {
            nombre:        iface.comentario || iface.nombre,
            interfaceName: iface.nombre,
            tipoInterfaz:  iface.tipo,
            ipGateway:     iface.ipGateway || null,
            subred:        iface.subred    || null,
            activa:        iface.activa,
            torreId:       parseInt(torreId)
          }
        });
        creadas.push(iface.nombre);
      }
    } catch (err) {
      errores.push({ interface: iface.nombre, error: err.message });
    }
  }

  // Actualizar ipPrincipal de la torre con el host del .env
  await prisma.torre.update({
    where: { id: parseInt(torreId) },
    data: { ipPrincipal: process.env.MIKROTIK_HOST || null }
  }).catch(() => {});

  res.json({ mensaje: 'Antenas procesadas', creadas, actualizadas, errores });
});

// GET /api/admin/mikrotik/sesiones-activas
// Retorna sesiones PPPoE activas con datos de vinculación a Servicios
router.get('/mikrotik/sesiones-activas', verificarToken, verificarAdmin, async (req, res) => {
  const mikrotikSvc = require('../services/mikrotik');
  try {
    const sesiones = await mikrotikSvc.obtenerSesionesConDetalle();

    // Enriquecer con datos de la BD
    const sesionesEnriquecidas = await Promise.all(sesiones.map(async (s) => {
      const servicio = await prisma.servicio.findFirst({
        where: { mikrotikUser: s.usuario },
        include: { cliente: true, paquete: true, antena: true, torre: true }
      });

      return {
        ...s,
        vinculado: !!servicio,
        cliente:   servicio?.cliente?.nombre   || null,
        numCliente: servicio?.cliente?.numCliente || null,
        plan:      servicio?.paquete?.nombre   || null,
        antena:    servicio?.antena?.nombre    || null,
        torre:     servicio?.torre?.nombre     || null,
        servicioId: servicio?.id               || null
      };
    }));

    res.json(sesionesEnriquecidas);
  } catch (error) {
    console.error('[MikroTik sesiones]:', error.message);
    res.status(500).json({ error: 'Error al obtener sesiones activas', detalle: error.message });
  }
});

// ── Geocodificación de dirección → coordenadas ──────────────────────────────
// GET /api/admin/geocodificar?q=Direccion
// Usa Mapbox Geocoding API con sesgo de proximidad hacia Colima, MX.
// La clave queda en el servidor; nunca se expone al navegador.
router.get('/geocodificar', verificarToken, verificarAdmin, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 3) {
    return res.status(400).json({ error: 'La dirección es muy corta para geocodificar' });
  }

  const mapboxToken = process.env.MAPBOX_TOKEN;
  if (!mapboxToken) {
    return res.status(500).json({ error: 'MAPBOX_TOKEN no está configurado en el .env del servidor' });
  }

  try {
    const query = encodeURIComponent(`${q.trim()}, Colima, México`);
    // proximity sesga resultados hacia el centro de Colima (lon, lat)
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&country=mx&language=es&proximity=-103.7250,19.2435&limit=1&types=address,place,poi,locality`;

    const response = await axios.get(url);
    const features = response.data.features;

    if (!features || features.length === 0) {
      return res.status(404).json({ error: 'No se encontraron coordenadas para esa dirección' });
    }

    const [longitud, latitud] = features[0].geometry.coordinates;
    return res.json({
      latitud,
      longitud,
      direccionFormateada: features[0].place_name
    });
  } catch (error) {
    console.error('[Geocodificación Mapbox]:', error.message);
    return res.status(500).json({ error: 'Error al conectar con el servicio de geocodificación' });
  }
});

module.exports = router;