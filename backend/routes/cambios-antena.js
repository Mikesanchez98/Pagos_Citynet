const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken, verificarAdmin } = require('../middleware/auth');
const sincronizacion = require('../services/sincronizacion-mikrotik');
const prisma = new PrismaClient();

router.get('/:servicioId', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { servicioId } = req.params;

    const cambios = await prisma.cambioAntena.findMany({
      where: { servicioId: parseInt(servicioId) },
      include: {
        antenaAnterior: true,
        antenaActual: true
      },
      orderBy: { timestamp: 'desc' }
    });

    res.json(cambios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sincronizar-ahora', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await sincronizacion.sincronizarServicios();

    res.json({
      success: true,
      resultado,
      mensaje: 'Sincronización completada'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;