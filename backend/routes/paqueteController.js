// backend/routes/paqueteController.js
const { PrismaClient } = require('@prisma/client');
const { schemas } = require('../middleware/validar');
const prisma = new PrismaClient();

// 1. Obtener todos los paquetes
exports.obtenerPaquetes = async (req, res) => {
  try {
    const paquetes = await prisma.paquete.findMany({
      orderBy: { precio: 'asc' }
    });
    res.json(paquetes);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los paquetes', error });
  }
};

// 2. Crear un nuevo paquete
exports.crearPaquete = async (req, res) => {
  const resultado = schemas.paquete.safeParse(req.body);
  if (!resultado.success) {
    const detalles = resultado.error.errors.map(e => ({ campo: e.path.join('.'), mensaje: e.message }));
    return res.status(400).json({ error: 'Datos inválidos', detalles });
  }

  const { nombre, velocidad, precio, descripcion } = resultado.data;
  try {
    const nuevoPaquete = await prisma.paquete.create({
      data: { nombre, velocidad, precio, descripcion }
    });
    res.status(201).json(nuevoPaquete);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear el paquete', error });
  }
};

// 3. Actualizar un paquete existente
exports.actualizarPaquete = async (req, res) => {
  const { id } = req.params;

  const resultado = schemas.paquete.safeParse(req.body);
  if (!resultado.success) {
    const detalles = resultado.error.errors.map(e => ({ campo: e.path.join('.'), mensaje: e.message }));
    return res.status(400).json({ error: 'Datos inválidos', detalles });
  }

  const { nombre, velocidad, precio, descripcion } = resultado.data;
  try {
    const paqueteActualizado = await prisma.paquete.update({
      where: { id: parseInt(id) },
      data: { nombre, velocidad, precio, descripcion }
    });
    res.json(paqueteActualizado);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar el paquete', error });
  }
};