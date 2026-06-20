// backend/server.js
require('dotenv').config(); // ⚠️ DEBE SER LA PRIMERA LÍNEA — carga el .env antes de cualquier import
const express = require('express');
const cors = require('cors');

// Importar rutas
const authRoutes = require('./routes/auth');
const clienteRoutes = require('./routes/cliente');
const adminRoutes = require('./routes/admin');
const paqueteRoutes = require('./routes/paquete');

if (process.env.VERCEL !== '1') {
  require('./services/automatizacion')(); 
}

const webhookPagos = require('./routes/webhook'); 
const rutasPagos = require('./routes/pagos'); 
//const iniciarCronFacturacion = require('./cron/facturacion'); 

const app = express();
const PORT = process.env.PORT || 3001;

// 🆕 MIKROTIK
const mikrotikService = require('./services/mikrotik');

// Conectar a MikroTik al iniciar
(async () => {
  try {
    await mikrotikService.connect();
    console.log('🟢 MikroTik conectado');
  } catch (error) {
    console.error('🔴 Error conectando a MikroTik:', error.message);
  }
})();

// Desconectar al apagar
process.on('SIGTERM', async () => {
  await mikrotikService.disconnect();
  process.exit(0);
});

// 🆕 Sincronización periódica (solo en desarrollo local, no en Vercel)
if (process.env.VERCEL !== '1') {
  require('./services/cron-sincronizacion')();
}

const listaBlanca = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://citynet-frontend.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
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

// ⚠️ El webhook de Openpay va ANTES de express.json()
// porque necesita el body crudo (raw) para validar la firma HMAC
app.use('/api/webhook', webhookPagos);

// El resto de rutas sí usan JSON parseado
app.use(express.json());

// RUTAS
app.use('/api/auth', authRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pagos', rutasPagos);
app.use('/api/paquetes', paqueteRoutes);
// 🆕 RUTAS MIKROTIK
const torresRoutes = require('./routes/torres');
const cambiosAntenaRoutes = require('./routes/cambios-antena');
const monitoreoRoutes = require('./routes/monitoreo');

app.use('/api/torres', torresRoutes);
app.use('/api/cambios-antena', cambiosAntenaRoutes);
app.use('/api/monitoreo', monitoreoRoutes);
//if (process.env.VERCEL !== '1') {
//  iniciarCronFacturacion(); 
//}

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Citynet en: http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.send('🚀 Servidor de Citynet operando correctamente');
});

module.exports = app;