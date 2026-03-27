const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Limpiar datos previos (opcional)
  await prisma.factura.deleteMany({});
  await prisma.servicio.deleteMany({});
  await prisma.cliente.deleteMany({});
  await prisma.usuario.deleteMany({});

  // 1. Crear Usuario y Cliente
  const nuevoUsuario = await prisma.usuario.create({
    data: {
      email: 'cliente@citynet.com',
      password: 'password123', // En producción usaremos bcrypt
      cliente: {
        create: {
          nombre: 'Juan Pérez',
          numCliente: 'CT-1001',
          servicios: {
            create: {
              plan: 'Hogar 20 Mbps',
              precio: 550.00,
              facturas: {
                create: {
                  monto: 550.00,
                  vencimiento: new Date('2026-04-05'),
                  pagada: false
                }
              }
            }
          }
        }
      }
    }
  });

  console.log('✅ Base de datos sembrada con éxito:', nuevoUsuario.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });