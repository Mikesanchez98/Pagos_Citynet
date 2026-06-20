const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seedAdmin() {
  console.log('🌱 Creando usuario admin...');

  try {
    // Crear usuario admin
    const passwordHasheada = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.usuario.create({
      data: {
        email: 'admin',
        password: passwordHasheada,
        rol: 'ADMIN'
      }
    });

    console.log('✅ Admin creado:');
    console.log('   Email: admin');
    console.log('   Password: admin123');
    console.log('   Rol: ADMIN');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();