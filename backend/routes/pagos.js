// backend/routes/pagos.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verificarToken } = require('../middleware/auth');

const MERCHANT_ID = process.env.OPENPAY_MERCHANT_ID;
const PRIVATE_KEY = process.env.OPENPAY_PRIVATE_KEY;
const AUTH_HEADER = Buffer.from(`${PRIVATE_KEY}:`).toString('base64');

const openpayAPI = axios.create({
  baseURL: `https://sandbox-api.openpay.mx/v1/${MERCHANT_ID}`,
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
          include: { facturas: { where: { pagada: false } } }
        }
      }
    });

    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado." });

    const facturasPendientes = cliente.servicios.flatMap(s => s.facturas);

    if (facturasPendientes.length === 0) {
      return res.status(400).json({ error: "No tienes facturas pendientes." });
    }

    const montoTotal = facturasPendientes.reduce((acc, f) => acc + Number(f.monto), 0);

    if (isNaN(montoTotal) || montoTotal <= 0) {
      return res.status(400).json({ error: "El monto a pagar no es válido." });
    }

    const checkoutData = {
      amount: Number(montoTotal.toFixed(2)),
      description: `Pago Acumulado Internet Citynet - ${cliente.nombre}`,
      order_id: `ORD-${Date.now()}-${cliente.id}`,
      currency: "MXN", 
      customer: {
        name: cliente.nombre || "Usuario",
        last_name: "Citynet", 
        email: "soporte@citynet.mx",
        // 👇 REGLA DE ORO: Si no hay teléfono, pasamos uno de relleno válido, NUNCA ""
        phone_number: cliente.telefono ? cliente.telefono : "5551234567" 
      },
      send_email: false,
      redirect_url: 'http://localhost:5173/dashboard' 
    };

    const respuestaOpenpay = await openpayAPI.post('/checkouts', checkoutData);
    res.status(200).json({ url: respuestaOpenpay.data.checkout_link });

  } catch (error) {
    console.error("[Error Checkout]:", error.response?.data || error.message);
    console.error("🚨 Error de Openpay al crear cargo:", error.response?.data || error.message);
    res.status(500).json({ error: "Error interno en la pasarela" });
  }
});

module.exports = router;