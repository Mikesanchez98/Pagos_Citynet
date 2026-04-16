// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken } = require('../middleware/auth');

const prisma = new PrismaClient();

// Middleware sencillo para checar si es ADMIN (puedes mejorarlo luego)
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
router.get('/cliente/:id', verificarToken, esAdmin, async (req, res) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { 
        usuario: true, 
        servicios: true 
      }
    });

    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

    res.json(cliente);
  } catch (error) {
    console.error("[Error Obtener Cliente]:", error);
    res.status(500).json({ error: "No se pudo cargar la información del cliente" });
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
  const { email, password, nombre, numCliente, plan, precio, ip } = req.body;

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
          usuarioId: usuario.id
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

// --- ACTUALIZACIÓN: GENERAR FACTURAS INTELIGENTES ---
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
  const { nombre, plan, precio, ip } = req.body;

  try {
    // Usamos una actualización que incluya los datos del servicio vinculado
    const clienteActualizado = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: {
        nombre: nombre,
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
router.patch('/factura/:id/pagar', verificarToken, async (req, res) => {
  try {
    await prisma.factura.update({
      where: { id: parseInt(req.params.id) },
      data: { pagada: true }
    });
    res.json({ mensaje: "Factura marcada como pagada" });
  } catch (error) {
    res.status(500).json({ error: "No se pudo actualizar" });
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

module.exports = router;