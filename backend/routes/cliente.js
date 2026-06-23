// backend/routes/cliente.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken } = require('../middleware/auth');

const prisma = new PrismaClient();

// Endpoint del Dashboard
router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.usuarioId },
      include: {
        usuario: true,
        servicios: {
          include: {
            paquete: true,
            facturas: {
              where: { pagada: false },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!cliente || cliente.servicios.length === 0) {
      return res.status(404).json({ error: "Datos de servicio incompletos" });
    }

    // Suma de todas las facturas pendientes de todos los servicios
    const montoPendiente = cliente.servicios.reduce((total, s) => {
      return total + s.facturas.reduce((sum, f) => sum + Number(f.monto), 0);
    }, 0);

    // Fecha de vencimiento más próxima entre todos los servicios
    const todasLasFacturas = cliente.servicios.flatMap(s => s.facturas);
    const proximoVencimiento = todasLasFacturas.sort(
      (a, b) => new Date(a.vencimiento) - new Date(b.vencimiento)
    )[0]?.vencimiento || null;

    const servicioPrincipal = cliente.servicios[0];

    res.json({
      id: cliente.id,
      nombre: cliente.nombre,
      numCliente: cliente.numCliente,

      // Campos legacy para compatibilidad con partes antiguas del frontend
      plan: servicioPrincipal.paquete?.nombre || 'Plan no especificado',
      ip: servicioPrincipal.direccionIp || '0.0.0.0',
      estado: servicioPrincipal.estado,

      montoPendiente: montoPendiente,
      vencimiento: proximoVencimiento,

      direccion: cliente.direccion || servicioPrincipal.direccion || 'Dirección no disponible',
      telefono: cliente.telefono || 'Teléfono no registrado',
      correo: cliente.usuario.email || cliente.email || 'Correo no registrado',

      // Estructura completa por servicio para el nuevo Dashboard
      servicios: cliente.servicios.map(s => ({
        id: s.id,
        estado: s.estado,
        direccion: s.direccion || null,
        direccionIp: s.direccionIp || null,
        paquete: {
          nombre: s.paquete?.nombre || null,
          precio: s.paquete?.precio || 0
        },
        facturas: s.facturas.map(f => ({
          id: f.id,
          monto: f.monto,
          vencimiento: f.vencimiento,
          pagada: f.pagada
        }))
      }))
    });
  } catch (error) {
    console.error("[Error Perfil]:", error);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

// CREAR TICKET DESDE EL PORTAL DEL CLIENTE
router.post('/mis-tickets', async (req, res) => {
  const { clienteId, titulo, descripcion } = req.body; 
  
  try {
    const nuevoTicket = await prisma.ticket.create({
      data: {
        titulo,
        descripcion,
        prioridad: 'MEDIA', 
        clienteId: parseInt(clienteId)
      }
    });
    res.json({ mensaje: "Ticket creado exitosamente", ticket: nuevoTicket });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el ticket" });
  }
});

// ENDPOINT PARA DESCARGAR EL PDF DE LA FACTURA
router.get('/factura/:id/pdf', verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Verificar que la factura exista y pertenezca al usuario logueado
    const factura = await prisma.factura.findUnique({
      where: { id: parseInt(id) },
      include: {
        servicio: {
          include: { cliente: true }
        }
      }
    });

    if (!factura || factura.servicio.cliente.usuarioId !== req.usuarioId) {
      return res.status(403).json({ error: "No tienes permiso para acceder a esta factura" });
    }

    // 2. CONFIGURACIÓN DEL ARCHIVO PDF
    // Opción A: Si ya tienes un archivo físico guardado en el servidor, usarías:
    // res.sendFile('/ruta/al/archivo.pdf');

    // Opción B: Generar una respuesta simulando un PDF o usando una librería de PDFs.
    // Para probar que la descarga funciona de inmediato sin instalar librerías extras,
    // vamos a decirle a Express que envíe un "Stream" de texto simulando el archivo:
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${id}.pdf`);

    // Aquí escribirías los bytes del PDF. Como prueba inicial rápida enviamos una estructura básica:
    res.write(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
    res.write(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
    res.write(`3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << >> /Contents 4 0 R >>\nendobj\n`);
    res.write(`4 0 obj\n<< /Length 60 >>\nstream\n`);
    res.write(`BT /F1 24 Tf 100 700 Td (CITYNET - FACTURA DIGITAL DE INTERNET) Tj ET\n`);
    res.write(`BT /F1 14 Tf 100 650 Td (Monto: $${factura.monto} MXN) Tj ET\n`);
    res.write(`endstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000198 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n308\n%%EOF`);
    
    return res.end();

  } catch (error) {
    console.error("[Error PDF Backend]:", error);
    res.status(500).json({ error: "Error al generar el PDF de la factura" });
  }
});

module.exports = router;