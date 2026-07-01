// backend/middleware/validar.js
// Schemas de validación con zod para las rutas críticas del backend.
// Uso: router.post('/ruta', verificarToken, validar(schemas.nombreSchema), async (req, res) => { ... })

const { z } = require('zod');

// ─────────────────────────────────────────────
// MIDDLEWARE GENÉRICO — aplica cualquier schema
// ─────────────────────────────────────────────
const validar = (schema) => (req, res, next) => {
  const resultado = schema.safeParse(req.body);

  if (!resultado.success) {
    const issues = resultado.error?.issues ?? resultado.error?.errors ?? [];
    const errores = issues.map(e => ({
      campo: e.path.join('.'),
      mensaje: e.message
    }));
    return res.status(400).json({
      error: 'Datos inválidos',
      detalles: errores
    });
  }

  // Reemplaza req.body con los datos ya limpios y casteados por zod
  req.body = resultado.data;
  next();
};

// ─────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────

const schemas = {

  // POST /api/admin/registrar-cliente
  registrarCliente: z.object({
    email:     z.string().min(1, 'El usuario es requerido'),
    password:  z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    nombre:    z.string().min(2, 'El nombre es requerido').max(100),
    numCliente:z.string().min(1, 'El número de cliente es requerido'),
    paqueteId: z.string().min(1, 'El plan es requerido'),
    ip:        z.string().optional().or(z.literal('')),
    torreId:   z.union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)])
                .optional()
                .nullable(),
    direccion: z.string().max(200).optional(),
    latitud:   z.union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)]).optional().nullable(),
    longitud:  z.union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)]).optional().nullable(),
    telefono:  z.string().optional().or(z.literal(''))
  }),

  // POST /api/paquetes  y  PUT /api/paquetes/:id
  paquete: z.object({
    nombre:      z.string().min(1, 'El nombre del paquete es requerido').max(100),
    velocidad:   z.number({ invalid_type_error: 'La velocidad debe ser un número' })
                  .int('La velocidad debe ser un número entero')
                  .positive('La velocidad debe ser mayor a 0'),
    precio:      z.number({ invalid_type_error: 'El precio debe ser un número' })
                  .positive('El precio debe ser mayor a 0'),
    descripcion: z.string().max(300).optional()
  }),

  // POST /api/admin/pagos
  registrarPago: z.object({
    clienteId:          z.number({ invalid_type_error: 'clienteId debe ser un número' }).int().positive(),
    monto:              z.number({ invalid_type_error: 'El monto debe ser un número' })
                         .positive('El monto debe ser mayor a 0'),
    mesCorrespondiente: z.string().max(20).optional().default(''),
    metodoPago:         z.enum(['Efectivo', 'Transferencia', 'Tarjeta', 'Openpay'], {
                          errorMap: () => ({ message: 'Método de pago inválido' })
                        }).default('Efectivo'),
    notas:              z.string().max(500).optional().default('')
  }),

};

module.exports = { validar, schemas };