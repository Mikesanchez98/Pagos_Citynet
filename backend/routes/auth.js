// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ [FATAL] JWT_SECRET no definido en variables de entorno.');
  process.exit(1);
}

// Máximo 5 intentos de login por IP cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,  // Envía headers RateLimit-* al cliente
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.'
  },
  handler: (req, res, next, options) => {
    console.warn(`⚠️ [RATE LIMIT] IP bloqueada por múltiples intentos de login: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// RUTA: POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: identifier },
          { cliente: { numCliente: identifier } }
        ]
      },
      include: { cliente: true }
    });

    const passwordValida = usuario && await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { usuarioId: usuario.id, rol: usuario.rol, clienteId: usuario.cliente?.id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol, // <--- Enviamos el rol al frontend
        nombre: usuario.cliente?.nombre || 'Administrador' // Nombre por defecto si no es cliente
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Error en el login' });
  }
});

module.exports = router;