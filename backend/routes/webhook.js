// backend/routes/webhook.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Necesitamos instanciar Axios aquí también para la capa de seguridad
const MERCHANT_ID = process.env.OPENPAY_MERCHANT_ID;
const PRIVATE_KEY = process.env.OPENPAY_PRIVATE_KEY;
const AUTH_HEADER = Buffer.from(`${PRIVATE_KEY}:`).toString('base64');

const openpayAPI = axios.create({
  baseURL: `https://sandbox-api.openpay.mx/v1/${MERCHANT_ID}`,
  headers: {
    'Authorization': `Basic ${AUTH_HEADER}`
  }
});

// POST /api/webhook/openpay
router.post('/openpay', async (req, res) => {
  const evento = req.body;
  
  console.log(`[Webhook] Evento recibido: ${evento.type}`);

  if (evento.type === 'charge.confirmed' || evento.type === 'charge.succeeded') {
    const ordenId = evento.transaction.order_id; 
    const transaccionId = evento.transaction.id; 

    try {
      // 🔒 SEGURIDAD: Validamos directamente con Openpay que el cargo sea real
      const verificacion = await openpayAPI.get(`/charges/${transaccionId}`);
      
      if (verificacion.data.status !== 'completed') {
        console.error("🚨 [Seguridad] Intento de fraude. Pago no completado.");
        return res.status(200).send("Ignorado"); 
      }

      const partesId = ordenId.split('-'); 
      const clienteId = parseInt(partesId[2]); 

      if (!clienteId || isNaN(clienteId)) {
        console.error("❌ [Webhook] Error: ID de cliente inválido:", ordenId);
        return res.sendStatus(200); 
      }

      // 1. Obtener los IDs de los servicios de este cliente
      const servicios = await prisma.servicio.findMany({
        where: { clienteId: clienteId },
        select: { id: true }
      });
      const servicioIds = servicios.map(s => s.id);

      // 2. Marcar facturas como pagadas
      const facturasActualizadas = await prisma.factura.updateMany({
        where: { 
          pagada: false, 
          servicioId: { in: servicioIds } 
        },
        data: { pagada: true }
      });

      // 3. Reactivar servicios suspendidos
      const serviciosActualizados = await prisma.servicio.updateMany({
        where: { clienteId: clienteId, estado: 'SUSPENDIDO' },
        data: { estado: 'ACTIVO' }
      });

      console.log(`✅ [Webhook] Éxito Cliente #${clienteId} | Facturas: ${facturasActualizadas.count} | Servicios: ${serviciosActualizados.count}`);
    } catch (error) {
      console.error("❌ [Webhook Error]:", error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});

module.exports = router;