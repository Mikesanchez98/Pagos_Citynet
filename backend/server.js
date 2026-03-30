// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth');
const clienteRoutes = require('./routes/cliente');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// RUTAS
app.use('/api/auth', authRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Citynet en: http://localhost:${PORT}`);
});

// Ruta raíz para confirmar que el servidor vive
app.get('/', (req, res) => {
  res.send('🚀 Servidor de Citynet operando correctamente');
});