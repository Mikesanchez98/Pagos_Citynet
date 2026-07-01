const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken, verificarAdmin } = require('../middleware/auth');
const importarService  = require('../services/importar-clientes-mikrotik');
const vincularService  = require('../services/vincular-clientes-dhcp');
const crearService     = require('../services/crear-clientes-desde-dhcp');
const iwispService     = require('../services/importar-iwisp');
const mikrotikService  = require('../services/mikrotik');

const prisma = new PrismaClient();

// POST /api/importar/clientes-mikrotik
// Importa PPP secrets → tabla ClienteMikrotik (staging), sin tocar Cliente directamente
router.post('/clientes-mikrotik', verificarToken, verificarAdmin, async (req, res) => {
  try {
    console.log('\n📌 Solicitud de importación recibida');
    const resultado = await importarService.importarClientes();
    res.json({ msg: 'Importación completada', resultado });
  } catch (error) {
    console.error('❌ Error en importación:', error);
    res.status(500).json({ error: 'Error al importar clientes', detalle: error.message });
  }
});

// POST /api/importar/crear-clientes
// Crea clientes (Usuario + Cliente + Servicio) desde leases DHCP importados
// Body: { paqueteId: "uuid-del-paquete-default" }
router.post('/crear-clientes', verificarToken, verificarAdmin, async (req, res) => {
  const { paqueteId } = req.body;
  if (!paqueteId) return res.status(400).json({ error: 'paqueteId es requerido como paquete por defecto' });
  try {
    console.log('\n📌 Solicitud de creación de clientes desde DHCP');
    const resultado = await crearService.crearClientes(paqueteId);
    res.json({ msg: 'Proceso completado', resultado });
  } catch (error) {
    console.error('❌ Error creando clientes:', error);
    res.status(500).json({ error: 'Error al crear clientes', detalle: error.message });
  }
});

// POST /api/importar/vincular-automatico
// Parsea comentarios DHCP ("17 - Nombre") → vincula MAC al Servicio + asigna antena por zona
router.post('/vincular-automatico', verificarToken, verificarAdmin, async (req, res) => {
  try {
    console.log('\n📌 Solicitud de auto-vinculación recibida');
    const resultado = await vincularService.vincularAutomatico();
    res.json({ msg: 'Auto-vinculación completada', resultado });
  } catch (error) {
    console.error('❌ Error en auto-vinculación:', error);
    res.status(500).json({ error: 'Error al vincular clientes', detalle: error.message });
  }
});

// POST /api/importar/iwisp
// Importa clientes desde el Excel de IWisp: crea nuevos y actualiza existentes
// Body: { paqueteId?: "uuid-fallback" }
router.post('/iwisp', verificarToken, verificarAdmin, async (req, res) => {
  const { paqueteId } = req.body;
  try {
    console.log('\n📌 Solicitud de importación IWisp');
    const resultado = await iwispService.importar(paqueteId || null);
    res.json({ msg: 'Importación IWisp completada', resultado });
  } catch (error) {
    console.error('❌ Error importación IWisp:', error);
    res.status(500).json({ error: 'Error al importar IWisp', detalle: error.message });
  }
});

// GET /api/importar/estado
// Muestra estadísticas de BD y estado de conexión MikroTik
router.get('/estado', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const [totalClientes, totalMikrotik, sinSincronizar, deshabilitados, health] = await Promise.all([
      prisma.cliente.count(),
      prisma.clienteMikrotik.count(),
      prisma.clienteMikrotik.count({ where: { sincronizado: false } }),
      prisma.clienteMikrotik.count({ where: { deshabilitado: true } }),
      mikrotikService.healthCheck()
    ]);

    res.json({
      bd: {
        totalClientes,
        totalMikrotik,
        sinSincronizar,
        deshabilitados
      },
      mikrotik: {
        conectado: health.ok,
        mock: health.mock,
        host: process.env.MIKROTIK_HOST || 'no configurado',
        port: process.env.MIKROTIK_PORT || 8728,
        usuario: process.env.MIKROTIK_USER || 'no configurado',
        detalle: health.error || health.identity || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
