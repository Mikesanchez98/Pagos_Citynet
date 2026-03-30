// backend/crearAdmin.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@citynet.com';
  const adminPassword = 'admin123'; // En producción esto debe ir encriptado con bcrypt

  const adminExistente = await prisma.usuario.findUnique({
    where: { email: adminEmail }
  });

  if (adminExistente) {
    console.log('⚠️ El administrador ya existe.');
    return;
  }

  const nuevoAdmin = await prisma.usuario.create({
    data: {
      email: adminEmail,
      password: adminPassword,
      rol: 'ADMIN' // <--- IMPORTANTE: Esto le da el poder
    }
  });

  console.log('✅ Administrador creado con éxito:');
  console.log('Usuario:', adminEmail);
  console.log('Password:', adminPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });