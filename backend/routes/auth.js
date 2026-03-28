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
  const { identifier, password } = req.body; // Cambiamos 'email' por 'identifier'

  try {
    // Buscamos al usuario que coincida con el email OR que su Cliente asociado tenga ese numCliente
    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: identifier },
          { 
            cliente: {
              numCliente: identifier // Aquí buscamos por CT-1001, por ejemplo
            }
          }
        ]
      },
      include: { cliente: true }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario o número de cliente no encontrado' });
    }

    if (usuario.password !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { usuarioId: usuario.id, clienteId: usuario.cliente?.id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        nombre: usuario.cliente?.nombre,
        numCliente: usuario.cliente?.numCliente,
        email: usuario.email
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;