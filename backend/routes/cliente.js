// backend/routes/cliente.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const verificarToken = require('../middleware/auth');

const prisma = new PrismaClient();

// backend/routes/cliente.js

// Endpoint del Dashboard
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

    if (!cliente || cliente.servicios.length === 0) {
      return res.status(404).json({ error: "Datos de servicio incompletos" });
    }

    // Suma robusta de todos los servicios
    const facturasPendientes = cliente.servicios.flatMap(s => s.facturas);
    const montoPendiente = facturasPendientes.reduce((acc, f) => acc + Number(f.monto), 0);
    
    // Tomamos datos representativos del primer servicio para la UI
    const servicioPrincipal = cliente.servicios[0];

    res.json({
      nombre: cliente.nombre,
      numCliente: cliente.numCliente,
      plan: servicioPrincipal.plan,
      ip: servicioPrincipal.direccionIp,
      montoPendiente: montoPendiente,
      vencimiento: facturasPendientes[0]?.vencimiento || null,
      estado: servicioPrincipal.estado
    });
  } catch (error) {
    console.error("[Error Perfil]:", error);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

module.exports = router;