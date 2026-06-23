const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken, verificarAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// ============================================================================
// POST /api/facturacion/cliente/:clienteId/generar-todas
// Genera UNA factura por cada servicio ACTIVO del cliente
// ============================================================================
router.post('/cliente/:clienteId/generar-todas', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const clienteId = parseInt(req.params.clienteId);
    if (isNaN(clienteId)) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }

    const servicios = await prisma.servicio.findMany({
      where: {
        clienteId: clienteId,
        estado: 'ACTIVO'
      },
      include: { paquete: true, cliente: true }
    });

    if (servicios.length === 0) {
      return res.status(400).json({ error: 'El cliente no tiene servicios activos' });
    }

    const facturasCreadas = [];
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    for (const servicio of servicios) {
      const facturaExistente = await prisma.factura.findFirst({
        where: {
          servicioId: servicio.id,
          pagada: false,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      });

      if (facturaExistente) {
        console.log(`⏭️  Factura ya existe para servicio ${servicio.id}`);
        continue;
      }

      const factura = await prisma.factura.create({
        data: {
          monto: servicio.paquete.precio,
          vencimiento: fechaVencimiento,
          pagada: false,
          servicioId: servicio.id,
          clienteId: servicio.clienteId
        }
      });

      facturasCreadas.push({
        servicioId: servicio.id,
        direccion: servicio.direccion,
        plan: servicio.paquete.nombre,
        monto: factura.monto,
        facturaId: factura.id
      });
    }

    res.json({
      msg: `Se generaron ${facturasCreadas.length} facturas`,
      facturas: facturasCreadas
    });

  } catch (error) {
    console.error('❌ Error al generar facturas:', error);
    res.status(500).json({ error: 'Error al generar facturas' });
  }
});

// ============================================================================
// GET /api/facturacion/cliente/:clienteId/facturas
// Obtiene TODAS las facturas del cliente (agrupadas por servicio)
// ============================================================================
router.get('/cliente/:clienteId/facturas', verificarToken, async (req, res) => {
  try {
    const clienteId = parseInt(req.params.clienteId);

    const facturas = await prisma.factura.findMany({
      where: { clienteId: clienteId },
      include: {
        servicio: {
          include: { paquete: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const facturasPorServicio = {};
    for (const factura of facturas) {
      if (!facturasPorServicio[factura.servicioId]) {
        facturasPorServicio[factura.servicioId] = {
          servicioId: factura.servicioId,
          direccion: factura.servicio.direccion,
          plan: factura.servicio.paquete.nombre,
          estado: factura.servicio.estado,
          facturas: []
        };
      }
      facturasPorServicio[factura.servicioId].facturas.push({
        facturaId: factura.id,
        monto: factura.monto,
        vencimiento: factura.vencimiento,
        pagada: factura.pagada,
        createdAt: factura.createdAt
      });
    }

    res.json(Object.values(facturasPorServicio));

  } catch (error) {
    console.error('❌ Error al obtener facturas:', error);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

// ============================================================================
// PATCH /api/facturacion/factura/:facturaId/pagar
// Pagar una factura específica (de un servicio específico)
// ============================================================================
router.patch('/factura/:facturaId/pagar', verificarToken, async (req, res) => {
  try {
    const facturaId = parseInt(req.params.facturaId);
    const { montoRecibido } = req.body;

    const factura = await prisma.factura.findUnique({
      where: { id: facturaId },
      include: { servicio: { include: { cliente: true } } }
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const montoRecibidoNum = parseFloat(montoRecibido) || 0;
    const vuelto = montoRecibidoNum - factura.monto;

    await prisma.$transaction([
      prisma.factura.update({
        where: { id: facturaId },
        data: { pagada: true }
      }),
      prisma.cliente.update({
        where: { id: factura.servicio.cliente.id },
        data: {
          saldo: {
            increment: vuelto > 0 ? vuelto : 0
          }
        }
      }),
      prisma.servicio.update({
        where: { id: factura.servicioId },
        data: {
          estado: 'ACTIVO',
          requiereReconexion: false
        }
      })
    ]);

    console.log(`✅ Factura #${facturaId} pagada. Vuelto: $${vuelto}`);

    res.json({
      msg: 'Factura pagada correctamente',
      vuelto: vuelto > 0 ? vuelto : 0,
      servicioId: factura.servicioId
    });

  } catch (error) {
    console.error('❌ Error al pagar factura:', error);
    res.status(500).json({ error: 'Error al procesar pago' });
  }
});

// ============================================================================
// POST /api/facturacion/servicio/:servicioId/reconectar
// Reconectar un servicio (agregar tarifa de $50)
// ============================================================================
router.post('/servicio/:servicioId/reconectar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const servicioId = parseInt(req.params.servicioId);
    const TARIFA_RECONEXION = 50;

    const servicio = await prisma.servicio.findUnique({
      where: { id: servicioId },
      include: { paquete: true, cliente: true }
    });

    if (!servicio) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 5);

    const facturaReconexion = await prisma.factura.create({
      data: {
        monto: TARIFA_RECONEXION,
        vencimiento: fechaVencimiento,
        pagada: false,
        servicioId: servicioId,
        clienteId: servicio.clienteId
      }
    });

    res.json({
      msg: 'Factura de reconexión generada',
      facturaId: facturaReconexion.id,
      monto: TARIFA_RECONEXION,
      vencimiento: fechaVencimiento
    });

  } catch (error) {
    console.error('❌ Error al generar reconexión:', error);
    res.status(500).json({ error: 'Error al generar reconexión' });
  }
});

// ============================================================================
// GET /api/facturacion/servicios-vencidos
// Obtiene servicios con facturas vencidas sin pagar
// ============================================================================
router.get('/servicios-vencidos', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const ahora = new Date();

    const serviciosVencidos = await prisma.servicio.findMany({
      where: {
        estado: 'ACTIVO',
        facturas: {
          some: {
            pagada: false,
            vencimiento: {
              lt: ahora
            }
          }
        }
      },
      include: {
        cliente: true,
        facturas: {
          where: { pagada: false }
        }
      }
    });

    res.json(serviciosVencidos);

  } catch (error) {
    console.error('❌ Error al obtener servicios vencidos:', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

module.exports = router;
