// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log("🚩 PASO 1: Variables de entorno cargadas con éxito"); // <-- RASTREADOR 1

// Importar rutas
const authRoutes = require('./routes/auth');
const clienteRoutes = require('./routes/cliente');
const adminRoutes = require('./routes/admin');
const paqueteRoutes = require('./routes/paquete');

console.log("🚩 PASO 2: Llegamos justo antes de la condicional de Vercel"); // <-- RASTREADOR 2

if (process.env.VERCEL !== '1') {
  require('./services/automatizacion'); 
}

console.log("🚩 PASO 3: Pasamos la condicional sin morir"); // <-- RASTREADOR 3

const webhook = require('./routes/webhook'); 
const rutasPagos = require('./routes/pagos'); 
const iniciarCronFacturacion = require('./cron/facturacion'); 

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
// backend/server.js

const listaBlanca = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://citynet-frontend.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Si la petición no tiene origen (como Postman o server-to-server) o está en la lista blanca
    if (!origin || listaBlanca.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por políticas de CORS de Citynet'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// RUTAS
app.use('/api/auth', authRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhook', webhook);
app.use('/api/pagos', rutasPagos); 
app.use('/api/paquetes', paqueteRoutes);
if (process.env.VERCEL !== '1') {
  iniciarCronFacturacion(); 
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Citynet en: http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.send('🚀 Servidor de Citynet operando correctamente');
});

module.exports = app;