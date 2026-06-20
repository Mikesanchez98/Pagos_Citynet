const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Creando datos de prueba...');

  try {
    // Usuario Admin
    let adminUser = await prisma.usuario.findFirst({
      where: { email: 'admin' }
    });

    if (!adminUser) {
      adminUser = await prisma.usuario.create({
        data: {
          email: 'admin',
          password: await bcrypt.hash('admin123', 10),
          rol: 'ADMIN'
        }
      });
      console.log('✅ Admin creado');
    } else {
      console.log('⚠️  Admin ya existe');
    }

    // Usuario Cliente
    let clienteUser = await prisma.usuario.findFirst({
      where: { email: 'cliente1' }
    });

    if (!clienteUser) {
      clienteUser = await prisma.usuario.create({
        data: {
          email: 'cliente1',
          password: await bcrypt.hash('cliente123', 10),
          rol: 'CLIENTE'
        }
      });
      console.log('✅ Cliente usuario creado');
    } else {
      console.log('⚠️  Cliente usuario ya existe');
    }

    // Cliente (perfil)
    let cliente = await prisma.cliente.findFirst({
      where: { numCliente: 'CLT-0001' }
    });

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nombre: 'Cliente Prueba',
          numCliente: 'CLT-0001',
          email: 'cliente@test.com',
          telefono: '5551234567',
          saldo: 0,
          diaCobro: 15,
          usuarioId: clienteUser.id
        }
      });
      console.log('✅ Cliente creado');
    } else {
      console.log('⚠️  Cliente ya existe');
    }

    console.log('\n📋 Credenciales de prueba:');
    console.log('   ADMIN:');
    console.log('   ├─ Email: admin');
    console.log('   └─ Password: admin123');
    console.log('\n   CLIENTE:');
    console.log('   ├─ Email: cliente1');
    console.log('   └─ Password: cliente123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();