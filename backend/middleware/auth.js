// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error("❌ [FATAL] JWT_SECRET no definido.");
    return res.status(500).json({ error: 'Error de configuración del servidor.' });
  }

  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(403).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuarioId = decoded.usuarioId;
    req.clienteId = decoded.clienteId;
    req.rol = decoded.rol;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' });
  }
};

// 2. NUEVO MIDDLEWARE: Exclusivo para proteger rutas /api/admin/...
const verificarAdmin = (req, res, next) => {
  // Primero debe haber pasado por verificarToken, así que req.rol ya existe
  if (req.rol !== 'ADMIN') {
    console.warn(`⚠️ [ALERTA DE SEGURIDAD] Intento de acceso a ruta Admin por Usuario ID: ${req.usuarioId}`);
    return res.status(403).json({ error: 'Acceso denegado. Privilegios insuficientes.' });
  }
  next();
};

module.exports = { verificarToken, verificarAdmin };