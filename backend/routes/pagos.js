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

// backend/routes/pagos.js
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

    const servicio = cliente.servicios[0];
    const facturasPendientes = servicio.facturas;

    if (facturasPendientes.length === 0) {
      return res.status(400).json({ error: "No tienes facturas pendientes de pago." });
    }

    // CORRECCIÓN CLAVE: Forzar que el monto sea numérico y no texto
    const montoTotal = facturasPendientes.reduce((acc, f) => {
      return acc + parseFloat(f.monto); 
    }, 0);

    // Si por alguna razón el monto es 0 o inválido
    if (isNaN(montoTotal) || montoTotal <= 0) {
      return res.status(400).json({ error: "El monto a pagar no es válido." });
    }

    // Configuración para Openpay
    const checkoutData = {
      method: 'card',
      amount: montoTotal.toFixed(2), // Openpay requiere 2 decimales en string
      description: `Pago Internet Citynet - ${cliente.nombre}`,
      order_id: `ORD-${Date.now()}-${cliente.id}`, // ID único para la orden
      customer: {
        name: cliente.nombre,
        email: cliente.usuario.email
      },
      send_email: true,
      confirm_url: 'http://localhost:3000/dashboard?pago=exitoso',
      cancel_url: 'http://localhost:3000/dashboard?pago=cancelado'
    };

    // Aquí va tu llamada a axios.post a Openpay (o la librería si la conservaste)
    // const response = await openpay.checkouts.create(checkoutData);
    // res.json({ url: response.payment_url });

  } catch (error) {
    console.error("Error detallado:", error.response?.data || error.message);
    res.status(500).json({ error: "Error interno en la pasarela" });
  }
});