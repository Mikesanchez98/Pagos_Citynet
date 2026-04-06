// backend/routes/cliente.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const verificarToken = require('../middleware/auth');

const prisma = new PrismaClient();

// backend/routes/cliente.js

// backend/routes/cliente.js
router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.usuarioId },
      include: { 
        servicios: {
          include: { facturas: { where: { pagada: false } } }
        } 
      }
    });

    const servicio = cliente.servicios[0];
    
    // Suma limpia asegurando tipos numéricos
    const montoPendiente = servicio.facturas.reduce((acc, f) => acc + parseFloat(f.monto), 0);

    res.json({
      nombre: cliente.nombre,
      numCliente: cliente.numCliente,
      plan: servicio.plan,
      ip: servicio.direccionIp,
      montoPendiente: montoPendiente, // Enviamos el número real
      vencimiento: servicio.facturas[0]?.vencimiento || null,
      estado: servicio.estado
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

// Ruta que Openpay llamará automáticamente (Webhook)
router.post('/webhook', async (req, res) => {
  const evento = req.body;

  // Verificamos que el evento sea de un pago completado
  if (evento.type === 'charge.confirmed') {
    const ordenId = evento.transaction.order_id; // Ej: "ORD-123-timestamp"
    const facturaId = ordenId.split('-')[1]; // Extraemos el ID de la factura

    try {
      // 1. Marcar factura como pagada
      await prisma.factura.update({
        where: { id: parseInt(facturaId) },
        data: { pagada: true }
      });

      // 2. Opcional: Si el servicio estaba suspendido, activarlo automáticamente
      const factura = await prisma.factura.findUnique({ where: { id: parseInt(facturaId) } });
      await prisma.servicio.update({
        where: { id: factura.servicioId },
        data: { estado: 'ACTIVO' }
      });

      console.log(`✅ Pago procesado para factura #${facturaId}`);
    } catch (error) {
      console.error("Error al actualizar tras pago:", error);
    }
  }

  // Siempre responder 200 a Openpay para que no reintente el envío
  res.sendStatus(200);
});

module.exports = router;