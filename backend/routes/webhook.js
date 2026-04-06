const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post('/openpay-webhook', async (req, res) => {
  const evento = req.body;

  // Solo nos interesa cuando la transacción fue completada con éxito
  if (evento.type === 'verification' || evento.type === 'charge.succeeded') {
    
    // 1. Si es de verificación inicial de Openpay, respondemos 200
    if (evento.type === 'verification') return res.sendStatus(200);

    const transaction = evento.transaction;
    
    try {
      // 2. Buscamos la factura que coincida con el ID de orden o descripción
      // Nota: Al crear el checkout, debiste enviar el invoiceId en la descripción o metadata
      const factura = await prisma.factura.findFirst({
        where: { 
          // Ajusta esto según cómo guardes tus IDs de transacción
          id: parseInt(transaction.order_id.split('-')[2]) 
        }
      });

      if (factura) {
        // 3. Marcamos la factura como PAGADA
        await prisma.factura.update({
          where: { id: factura.id },
          data: { pagada: true }
        });

        // 4. REACTIVACIÓN AUTOMÁTICA
        // Buscamos el servicio y lo ponemos en ACTIVO
        await prisma.servicio.update({
          where: { id: factura.servicioId },
          data: { estado: 'ACTIVO' }
        });

        console.log(`✅ Pago confirmado: Servicio ${factura.servicioId} reactivado.`);
      }

      res.sendStatus(200); // Dile a Openpay que recibiste el mensaje
    } catch (error) {
      console.error("Error procesando webhook:", error);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(200); // Otros eventos (fallidos, etc) solo los ignoramos
  }
});

module.exports = router;