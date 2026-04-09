// backend/routes/pagos.js
const axios = require('axios');

// Configuración manual (Sin librerías obsoletas)
const MERCHANT_ID = process.env.OPENPAY_MERCHANT_ID;
const PRIVATE_KEY = process.env.OPENPAY_PRIVATE_KEY;
// Codificamos la llave en Base64 para la autenticación básica de Openpay
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

    // Aplanamos todas las facturas pendientes de TODOS los servicios del cliente
    const facturasPendientes = cliente.servicios.flatMap(s => s.facturas);

    if (facturasPendientes.length === 0) {
      return res.status(400).json({ error: "No tienes facturas pendientes de pago." });
    }

    // Casteo estricto del Decimal de Prisma a Number de JS
    const montoTotal = facturasPendientes.reduce((acc, f) => {
      return acc + Number(f.monto); 
    }, 0);

    console.log(`[Checkout] Cliente ${cliente.id} | Facturas a pagar: ${facturasPendientes.length} | Total: $${montoTotal}`);

    if (isNaN(montoTotal) || montoTotal <= 0) {
      return res.status(400).json({ error: "El monto a pagar no es válido." });
    }

    const checkoutData = {
      method: 'card',
      amount: montoTotal.toFixed(2), 
      description: `Pago Acumulado Internet Citynet - ${cliente.nombre}`,
      // El índice 2 del split será el cliente.id, clave para el webhook
      order_id: `ORD-${Date.now()}-${cliente.id}`, 
      customer: {
        name: cliente.nombre,
        email: cliente.usuario.email
      },
      send_email: true,
      confirm_url: 'http://localhost:3000/dashboard?pago=exitoso',
      cancel_url: 'http://localhost:3000/dashboard?pago=cancelado'
    };

    // Lógica de Axios a Openpay aquí...

  } catch (error) {
    console.error("[Error Checkout]:", error.response?.data || error.message);
    res.status(500).json({ error: "Error interno en la pasarela" });
  }
});