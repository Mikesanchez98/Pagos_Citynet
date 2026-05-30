// backend/routes/paquete.js
const express = require('express');
const router = express.Router();
const paqueteController = require('./paqueteController');

// Rutas para /api/paquetes
router.get('/', paqueteController.obtenerPaquetes);
router.post('/', paqueteController.crearPaquete);
router.put('/:id', paqueteController.actualizarPaquete);
module.exports = router;