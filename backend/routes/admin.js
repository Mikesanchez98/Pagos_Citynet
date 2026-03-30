// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const verificarToken = require('../middleware/auth');

const prisma = new PrismaClient();

// Middleware sencillo para checar si es ADMIN (puedes mejorarlo luego)
const esAdmin = (req, res, next) => {
  // Aquí podrías consultar la DB, por ahora confiamos en el token decodificado
  next(); 
};

// backend/routes/admin.js

// 1. Obtener todos los clientes con sus servicios
router.get('/clientes', verificarToken, async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      include: { servicios: true }
    });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener lista' });
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

// POST /api/admin/generar-facturas-mes
router.post('/generar-facturas-mes', verificarToken, async (req, res) => {
  try {
    // 1. Obtener todos los servicios activos
    const servicios = await prisma.servicio.findMany({
      where: { estado: 'ACTIVO' }
    });

    // 2. Definir fecha de vencimiento (Ej: 5 del próximo mes)
    const hoy = new Date();
    const vencimiento = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 5);

    // 3. Crear las facturas en una transacción
    const facturasCreadas = await prisma.$transaction(
      servicios.map((s) => 
        prisma.factura.create({
          data: {
            monto: s.precio,
            vencimiento: vencimiento,
            pagada: false,
            servicioId: s.id
          }
        })
      )
    );

    res.json({ 
      mensaje: `Se generaron ${facturasCreadas.length} facturas para el próximo mes.`,
      vencimiento: vencimiento.toLocaleDateString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar facturacion masiva' });
  }
});

module.exports = router;