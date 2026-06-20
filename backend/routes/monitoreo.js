const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middleware/auth');
const mikrotikService = require('../services/mikrotik');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/clientes-conectados', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const sesiones = await mikrotikService.obtenerSesionesActivas();

    const clientesConectados = await Promise.all(
      sesiones.map(async (sesion) => {
        const cliente = await prisma.cliente.findUnique({
          where: { numCliente: sesion.usuario },
          include: { servicios: { include: { paquete: true } } }
        });

        return {
          ...sesion,
          nombre: cliente?.nombre || 'Desconocido',
          clienteId: cliente?.id,
          plan: cliente?.servicios?.[0]?.paquete?.nombre || 'N/A'
        };
      })
    );

    res.json({
      total: clientesConectados.length,
      clientes: clientesConectados,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/health', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const status = await mikrotikService.healthCheck();

    res.json({
      router1: status ? '🟢 OK' : '🔴 OFFLINE',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;