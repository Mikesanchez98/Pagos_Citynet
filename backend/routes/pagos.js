// backend/routes/pagos.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verificarToken } = require('../middleware/auth');

const MERCHANT_ID = process.env.OPENPAY_MERCHANT_ID;
const PRIVATE_KEY = process.env.OPENPAY_PRIVATE_KEY;
const IS_SANDBOX  = process.env.OPENPAY_SANDBOX !== 'false';
const BASE_URL    = IS_SANDBOX
  ? `https://sandbox-api.openpay.mx/v1/${MERCHANT_ID}`
  : `https://api.openpay.mx/v1/${MERCHANT_ID}`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const AUTH_HEADER = Buffer.from(`${PRIVATE_KEY}:`).toString('base64');

const openpayAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Basic ${AUTH_HEADER}`,
    'Content-Type': 'application/json'
  }
});

router.post('/crear-checkout', verificarToken, async (req, res) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.usuarioId },
      include: { 
        usuario: true,
        servicios: {
          include: { paquete: true }
        },
        facturas: { where: { pagada: false } }
      }
    });

    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado." });

    if (cliente.facturas.length === 0) {
      return res.status(400).json({ error: "No tienes facturas pendientes." });
    }

    const montoTotal = cliente.facturas.reduce((acc, f) => acc + Number(f.monto), 0);

    if (isNaN(montoTotal) || montoTotal <= 0) {
      return res.status(400).json({ error: "El monto a pagar no es válido." });
    }

    const checkoutData = {
      amount:      Number(montoTotal.toFixed(2)),
      description: `Pago Acumulado Internet Citynet - ${cliente.nombre}`,
      order_id:    `ORD-${Date.now()}-${cliente.id}`,
      currency:    "MXN",
      customer: {
        name:         cliente.nombre || "Usuario",
        last_name:    "Citynet",
        email:        `${cliente.usuario.email}@citynet.mx`, // Email válido: MSalazar@citynet.mx
        phone_number: cliente.telefono || "5551234567"
      },
      send_email:   false,
      redirect_url: `${FRONTEND_URL}/dashboard`
    };

    const respuestaOpenpay = await openpayAPI.post('/checkouts', checkoutData);
    res.status(200).json({ url: respuestaOpenpay.data.checkout_link });

  } catch (error) {
    console.error("[Error Checkout]:", error.response?.data || error.message);
    res.status(500).json({ error: "Error interno en la pasarela" });
  }
});

module.exports = router;