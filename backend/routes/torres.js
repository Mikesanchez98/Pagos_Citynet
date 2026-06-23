const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken, verificarAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const torres = await prisma.torre.findMany({
      include: {
        antenas: {
          include: {
            servicios: {
              include: {
                cliente: true,
                paquete: true
              }
            }
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    const resultado = torres.map(torre => ({
      id: torre.id,
      nombre: torre.nombre,
      ipPrincipal: torre.ipPrincipal,
      latitud: torre.latitud,
      longitud: torre.longitud,
      antenas: torre.antenas.map(antena => ({
        id: antena.id,
        nombre: antena.nombre,
        ipGateway: antena.ipGateway,
        subred: antena.subred,
        interfaceName: antena.interfaceName,
        activa: antena.activa,
        clientesConectados: antena.servicios.length,
        clientes: antena.servicios.map(servicio => ({
          clienteId:            servicio.clienteId,
          servicioId:           servicio.id,
          numCliente:           servicio.cliente.numCliente,
          nombre:               servicio.cliente.nombre,
          plan:                 servicio.paquete?.nombre   || 'Sin plan',
          ipAsignada:           servicio.direccionIp,
          macAddress:           servicio.macAddress,
          estado:               servicio.estado,
          mikrotikUser:         servicio.mikrotikUser,
          ultimaSincronizacion: servicio.ultimaSincronizacion
        }))
      }))
    }));

    res.json(resultado);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/antenas', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const antenas = await prisma.antena.findMany({
      where: { torreId: parseInt(id) },
      include: {
        servicios: {
          include: {
            cliente: true,
            paquete: true
          }
        }
      }
    });

    res.json(antenas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;