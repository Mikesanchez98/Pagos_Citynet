// backend/routes/cliente.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const verificarToken = require('../middleware/auth');

const prisma = new PrismaClient();

// backend/routes/cliente.js

router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: req.clienteId },
      include: {
        servicios: {
          include: {
            facturas: {
              where: { pagada: false },
              orderBy: { vencimiento: 'asc' },
              take: 1 // Traemos solo la factura más próxima a vencer
            }
          }
        }
      }
    });

    if (!cliente || cliente.servicios.length === 0) {
      return res.status(404).json({ error: 'No se encontraron servicios' });
    }

    const servicioPrincipal = cliente.servicios[0];
    const facturaPendiente = servicioPrincipal.facturas[0];

    res.json({
      nombre: cliente.nombre,
      numCliente: cliente.numCliente,
      plan: servicioPrincipal.plan,
      ip: servicioPrincipal.direccionIp,
      estado: servicioPrincipal.estado,
      montoPendiente: facturaPendiente ? Number(facturaPendiente.monto) : 0,
      vencimiento: facturaPendiente ? facturaPendiente.vencimiento : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;