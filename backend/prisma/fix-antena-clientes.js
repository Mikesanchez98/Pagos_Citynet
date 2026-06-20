const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAntena() {
  console.log('🔧 Reassignando clientes a antena correcta...\n');

  try {
    // Actualizar todos los servicios de los clientes importados
    const resultado = await prisma.servicio.updateMany({
      where: {
        antenaId: 5  // Los que están en antena incorrecta
      },
      data: {
        antenaId: 6  // Cambiar a vlan110-Gpon
      }
    });

    console.log(`✅ ${resultado.count} servicios actualizados a antena ID 6 (vlan110-Gpon)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAntena();