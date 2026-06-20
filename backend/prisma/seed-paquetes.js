const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPaquetes() {
  console.log('🌱 Creando paquetes...\n');

  const paquetes = [
  {
    id: 'basico-5m',
    nombre: 'Básico 5 Mbps',
    velocidad: 5,
    precio: 199.99,
    descripcion: 'Plan básico ideal para navegación y redes sociales'
  },
  {
    id: 'estandar-10m',
    nombre: 'Estándar 10 Mbps',
    velocidad: 10,
    precio: 299.99,
    descripcion: 'Plan estándar para trabajo en casa y streaming'
  },
  {
    id: 'intermedio-20m',
    nombre: 'Intermedio 20 Mbps',
    velocidad: 20,
    precio: 399.99,
    descripcion: 'Plan intermedio para múltiples dispositivos'
  },
  {
    id: 'premium-30m',
    nombre: 'Premium 30 Mbps',
    velocidad: 30,
    precio: 499.99,
    descripcion: 'Plan premium para uso intensivo'
  },
  {
    id: 'profesional-50m',
    nombre: 'Profesional 50 Mbps',
    velocidad: 50,
    precio: 699.99,
    descripcion: 'Plan profesional para empresas pequeñas'
  },
  {
    id: 'ejecutivo-100m',
    nombre: 'Ejecutivo 100 Mbps',
    velocidad: 100,
    precio: 999.99,
    descripcion: 'Plan ejecutivo para empresa grande'
  },
  {
    id: 'fibra-gpon-100m',
    nombre: 'Fibra GPON 100 Mbps',
    velocidad: 100,
    precio: 1099.99,
    descripcion: 'Conexión GPON de fibra óptica simétrica'
  },
  {
    id: 'fibra-gpon-200m',
    nombre: 'Fibra GPON 200 Mbps',
    velocidad: 200,
    precio: 1499.99,
    descripcion: 'Conexión GPON de fibra óptica de alta velocidad'
  }
];

  try {
    for (const paquete of paquetes) {
      // Verificar si ya existe
      const existe = await prisma.paquete.findUnique({
        where: { id: paquete.id }
      });

      if (existe) {
        console.log(`⚠️  ${paquete.nombre} ya existe`);
        continue;
      }

      // Crear paquete
      const nuevo = await prisma.paquete.create({
        data: paquete
      });

      console.log(`✅ ${nuevo.nombre} (${nuevo.id})`);
    }

    console.log('\n📊 RESUMEN:');
    console.log(`   Total de paquetes: ${paquetes.length}`);
    console.log('\n✅ Paquetes creados exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedPaquetes();