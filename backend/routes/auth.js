// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_citynet';

// RUTA: POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar al usuario por email e incluir sus datos de cliente
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { cliente: true }
    });

    // 2. Verificar si existe el usuario
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 3. Verificar contraseña (NOTA: En producción usaremos bcrypt.compare)
    if (usuario.password !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 4. Generar el Token de acceso (JWT)
    const token = jwt.sign(
      { usuarioId: usuario.id, email: usuario.email, clienteId: usuario.cliente?.id },
      JWT_SECRET,
      { expiresIn: '8h' } // El token expira en 8 horas
    );

    // 5. Enviar respuesta al frontend
    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        nombre: usuario.cliente?.nombre,
        email: usuario.email,
        numCliente: usuario.cliente?.numCliente
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;