// backend/routes/webhook.js
const express  = require('express');
const router   = express.Router();
const axios    = require('axios');
const crypto   = require('crypto'); // nativo de Node — no requiere instalación
const { PrismaClient } = require('@prisma/client');
const prisma   = new PrismaClient();

const MERCHANT_ID  = process.env.OPENPAY_MERCHANT_ID;
const PRIVATE_KEY  = process.env.OPENPAY_PRIVATE_KEY;
const IS_SANDBOX   = process.env.OPENPAY_SANDBOX !== 'false';
const BASE_URL     = IS_SANDBOX
  ? `https://sandbox-api.openpay.mx/v1/${MERCHANT_ID}`
  : `https://api.openpay.mx/v1/${MERCHANT_ID}`;

const AUTH_HEADER = Buffer.from(`${PRIVATE_KEY}:`).toString('base64');

const openpayAPI = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Basic ${AUTH_HEADER}` }
});

// ─────────────────────────────────────────────────────────────
// VALIDACIÓN DE FIRMA HMAC-SHA256
// Openpay envía el header "X-OpenPay-Signature" con cada evento.
// Lo recalculamos con nuestra llave privada y comparamos.
// Si no coincide → rechazamos con 401 (posible petición falsa).
// ─────────────────────────────────────────────────────────────
const validarFirmaOpenpay = (req, res, next) => {
  // En sandbox Openpay no siempre envía la firma — la omitimos solo ahí
  if (IS_SANDBOX) return next();

  const firmaRecibida = req.headers['x-openpay-signature'];
  if (!firmaRecibida) {
    console.warn('[Webhook] Petición sin firma X-OpenPay-Signature — rechazada');
    return res.status(401).json({ error: 'Firma requerida' });
  }

  // Openpay firma el raw body con HMAC-SHA256 usando la llave privada
  const firmaEsperada = crypto
    .createHmac('sha256', PRIVATE_KEY)
    .update(req.rawBody) // rawBody lo capturamos en el middleware de abajo
    .digest('hex');

  // Comparación segura contra timing attacks
  const firmaRecibidaBuf  = Buffer.from(firmaRecibida,  'hex');
  const firmaEsperadaBuf  = Buffer.from(firmaEsperada,  'hex');

  if (
    firmaRecibidaBuf.length !== firmaEsperadaBuf.length ||
    !crypto.timingSafeEqual(firmaRecibidaBuf, firmaEsperadaBuf)
  ) {
    console.warn('[Webhook] ⚠️ Firma inválida — posible intento de fraude');
    return res.status(401).json({ error: 'Firma inválida' });
  }

  next();
};

// Middleware que captura el raw body Y parsea JSON — solo para esta ruta
const rawBodyParser = express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
});

// POST /api/webhook/openpay
router.post('/openpay', rawBodyParser, validarFirmaOpenpay, async (req, res) => {
  const evento = req.body;

  // Handshake inicial de verificación de Openpay
  if (evento.verification_code) {
    console.log(`[Webhook] Verificación Openpay: ${evento.verification_code}`);
    return res.status(200).send(evento.verification_code);
  }

  console.log(`[Webhook] Evento recibido: ${evento.type}`);

  if (evento.type === 'charge.confirmed' || evento.type === 'charge.succeeded') {
    const ordenId       = evento.transaction?.order_id;
    const transaccionId = evento.transaction?.id;

    if (!ordenId || !transaccionId) {
      console.error('[Webhook] Evento sin order_id o transaction.id');
      return res.sendStatus(200);
    }

    try {
      // Anti-fraude: verificar directamente con Openpay que el cargo está completado
      const verificacion = await openpayAPI.get(`/charges/${transaccionId}`);

      if (verificacion.data.status !== 'completed') {
        console.warn(`[Webhook] Cargo ${transaccionId} no completado. Estado: ${verificacion.data.status}`);
        return res.status(200).send('Ignorado');
      }

      // Extraer clienteId del order_id → formato: "ORD-{timestamp}-{clienteId}"
      const partesId  = ordenId.split('-');
      const clienteId = parseInt(partesId[2]);

      if (!clienteId || isNaN(clienteId)) {
        console.error('[Webhook] clienteId inválido en order_id:', ordenId);
        return res.sendStatus(200);
      }

      // Idempotencia: verificar que este pago no haya sido procesado antes
      const pagoExistente = await prisma.pago.findFirst({
        where: { notas: { contains: transaccionId } }
      });

      if (pagoExistente) {
        console.log(`[Webhook] Pago ${transaccionId} ya procesado — omitido`);
        return res.sendStatus(200);
      }

      // Ejecutar todo en una transacción atómica
      await prisma.$transaction(async (tx) => {
        // 1. Marcar facturas pendientes como pagadas
        const facturasActualizadas = await tx.factura.updateMany({
          where: { clienteId, pagada: false },
          data:  { pagada: true }
        });

        // 2. Registrar en historial de pagos
        await tx.pago.create({
          data: {
            clienteId,
            monto:              verificacion.data.amount,
            mesCorrespondiente: new Date().toLocaleString('es-MX', {
              month: 'long', year: 'numeric'
            }).toUpperCase(),
            metodoPago: 'Openpay',
            notas:      `Transacción Openpay: ${transaccionId}`
          }
        });

        // 3. Reactivar servicios suspendidos
        const serviciosActualizados = await tx.servicio.updateMany({
          where: { clienteId, estado: 'SUSPENDIDO' },
          data:  { estado: 'ACTIVO' }
        });

        console.log(`✅ [Webhook] Cliente #${clienteId} | Facturas: ${facturasActualizadas.count} | Servicios reactivados: ${serviciosActualizados.count}`);
      });

    } catch (error) {
      console.error('[Webhook Error]:', error.response?.data || error.message);
      // Siempre 200 para que Openpay no reintente indefinidamente
    }
  }

  res.sendStatus(200);
});

module.exports = router;