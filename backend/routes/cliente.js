// backend/routes/cliente.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const verificarToken = require('../middleware/auth');

const prisma = new PrismaClient();

// backend/routes/cliente.js

// Endpoint del Dashboard
router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.usuarioId },
      include: { 
        servicios: {
          include: { facturas: { where: { pagada: false } } }
        } 
      }
    });

    if (!cliente || cliente.servicios.length === 0) {
      return res.status(404).json({ error: "Datos de servicio incompletos" });
    }

    // Suma robusta de todos los servicios
    const facturasPendientes = cliente.servicios.flatMap(s => s.facturas);
    const montoPendiente = facturasPendientes.reduce((acc, f) => acc + Number(f.monto), 0);
    
    // Tomamos datos representativos del primer servicio para la UI
    const servicioPrincipal = cliente.servicios[0];

    res.json({
      nombre: cliente.nombre,
      numCliente: cliente.numCliente,
      plan: servicioPrincipal.plan,
      ip: servicioPrincipal.direccionIp,
      montoPendiente: montoPendiente,
      vencimiento: facturasPendientes[0]?.vencimiento || null,
      estado: servicioPrincipal.estado
    });
  } catch (error) {
    console.error("[Error Perfil]:", error);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

// El Webhook Corregido
router.post('/webhook', async (req, res) => {
  const evento = req.body;

  if (evento.type === 'charge.confirmed') {
    const ordenId = evento.transaction.order_id; 
    const partesId = ordenId.split('-'); // ["ORD", "1689000000", "5"]
    
    // Extraemos el clienteId, NO el timestamp
    const clienteId = parseInt(partesId[2]); 

    if (!clienteId || isNaN(clienteId)) {
      console.error("❌ Webhook fallido: No se pudo extraer el ID del cliente de la orden:", ordenId);
      return res.sendStatus(200); 
    }

    try {
      // 1. Marcar TODAS las facturas pendientes de este cliente como pagadas
      const facturasActualizadas = await prisma.factura.updateMany({
        where: { 
          pagada: false,
          servicio: { clienteId: clienteId } 
        },
        data: { pagada: true }
      });

      // 2. Reactivar TODOS los servicios suspendidos del cliente
      const serviciosActualizados = await prisma.servicio.updateMany({
        where: { clienteId: clienteId, estado: 'SUSPENDIDO' },
        data: { estado: 'ACTIVO' }
      });

      console.log(`✅ Pago procesado para Cliente #${clienteId}. Facturas saldadas: ${facturasActualizadas.count}. Servicios reactivados: ${serviciosActualizados.count}`);
    } catch (error) {
      console.error("❌ Error DB al actualizar tras pago:", error);
    }
  }

  res.sendStatus(200);
});

module.exports = router;