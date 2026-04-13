// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth');
const clienteRoutes = require('./routes/cliente');
const adminRoutes = require('./routes/admin');
require('./services/automatizacion'); // Importamos el servicio de automatización (cron job)
const webhook = require('./routes/webhook'); // Importamos la ruta del webhook de Openpay

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// RUTAS
app.use('/api/auth', authRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhook', webhook);

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Citynet en: http://localhost:${PORT}`);
});

// Ruta raíz para confirmar que el servidor vive
app.get('/', (req, res) => {
  res.send('🚀 Servidor de Citynet operando correctamente');
});