const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/webhooks/openpay
router.post('/openpay', async (req, res) => {
  const evento = req.body;

  if (evento.type === 'charge.confirmed') {
    const ordenId = evento.transaction.order_id; 
    const partesId = ordenId.split('-'); 
    const clienteId = parseInt(partesId[2]); 

    if (!clienteId || isNaN(clienteId)) {
      console.error("❌ [Webhook] Error: No se pudo extraer el ID del cliente de la orden:", ordenId);
      return res.sendStatus(200); 
    }

    try {
      // 1. Marcar facturas como pagadas
      const facturasActualizadas = await prisma.factura.updateMany({
        where: { pagada: false, servicio: { clienteId: clienteId } },
        data: { pagada: true }
      });

      // 2. Reactivar servicios suspendidos
      const serviciosActualizados = await prisma.servicio.updateMany({
        where: { clienteId: clienteId, estado: 'SUSPENDIDO' },
        data: { estado: 'ACTIVO' }
      });

      console.log(`✅ [Webhook] Pago exitoso Cliente #${clienteId} | Facturas saldadas: ${facturasActualizadas.count}`);
    } catch (error) {
      console.error("❌ [Webhook DB Error]:", error);
    }
  }

  // Siempre responder 200 OK a Openpay
  res.sendStatus(200);
});

module.exports = router;