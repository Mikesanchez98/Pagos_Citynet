// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_citynet';

const verificarToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Espera "Bearer TOKEN"

  if (!token) {
    return res.status(403).json({ error: 'No se proporcionó un token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuarioId = decoded.usuarioId;
    req.clienteId = decoded.clienteId;
    next(); // ¡Todo bien! Pasa a la siguiente función
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = verificarToken;