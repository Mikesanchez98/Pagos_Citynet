// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_citynet';

// RUTA: POST /api/auth/login
// backend/routes/auth.js

router.post('/login', async (req, res) => {
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

    if (!usuario || usuario.password !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { usuarioId: usuario.id, rol: usuario.rol, clienteId: usuario.cliente?.id },
      process.env.JWT_SECRET || 'clave_secreta_citynet',
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