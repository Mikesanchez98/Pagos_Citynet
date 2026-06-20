const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Creando torres y antenas...');

  // Datos de tu auditoría del router
  const torres = [
    { nombre: 'Primaveras', ipPrincipal: '10.5.0.1' },
    { nombre: 'Chivato', ipPrincipal: '10.5.8.1' },
    { nombre: 'Mirador', ipPrincipal: '10.5.24.1' },
    { nombre: 'VillaItzcali', ipPrincipal: '10.5.32.1' },
    { nombre: 'DeltaMonti-Gpon', ipPrincipal: '10.5.40.1' },
    { nombre: 'ValleDelSol', ipPrincipal: '10.5.50.1' },
    { nombre: 'CMFurukawa', ipPrincipal: '10.5.56.1' }
  ];

  for (const torreData of torres) {
    // Buscar si la torre existe
    let torre = await prisma.torre.findFirst({
      where: { nombre: torreData.nombre }
    });

    // Si no existe, crearla
    if (!torre) {
      torre = await prisma.torre.create({
        data: torreData
      });
    } else {
      // Si existe, actualizar
      torre = await prisma.torre.update({
        where: { id: torre.id },
        data: { ipPrincipal: torreData.ipPrincipal }
      });
    }

    console.log(`✅ Torre: ${torre.nombre}`);
  }

  // Crear antenas
  const antenasPorTorre = {
    'Primaveras': [
      {
        nombre: 'ether5-Primaveras',
        ipGateway: '10.5.0.1',
        subred: '10.5.0.0/21',
        interfaceName: 'ether5',
        tipoInterfaz: 'ether'
      }
    ],
    'Chivato': [
      {
        nombre: 'ether6-Chivato',
        ipGateway: '10.5.8.1',
        subred: '10.5.8.0/21',
        interfaceName: 'ether6',
        tipoInterfaz: 'ether'
      }
    ],
    'Mirador': [
      {
        nombre: 'ether8-Mirador',
        ipGateway: '10.5.24.1',
        subred: '10.5.24.0/21',
        interfaceName: 'ether8',
        tipoInterfaz: 'ether'
      }
    ],
    'VillaItzcali': [
      {
        nombre: 'ether7-VillaItzcali',
        ipGateway: '10.5.32.1',
        subred: '10.5.32.0/21',
        interfaceName: 'ether7',
        tipoInterfaz: 'ether'
      }
    ],
    'DeltaMonti-Gpon': [
      {
        nombre: 'ether4-DeltaMonti-Gpon',
        ipGateway: '10.5.40.1',
        subred: '10.5.40.0/21',
        interfaceName: 'ether4',
        tipoInterfaz: 'ether'
      },
      {
        nombre: 'vlan110-Gpon',
        ipGateway: '10.105.40.1',
        subred: '10.105.40.0/21',
        interfaceName: 'vlan110',
        tipoInterfaz: 'vlan'
      }
    ],
    'ValleDelSol': [
      {
        nombre: 'ether10-ValleDelSol',
        ipGateway: '10.5.50.1',
        subred: '10.5.48.0/21',
        interfaceName: 'ether10',
        tipoInterfaz: 'ether'
      }
    ],
    'CMFurukawa': [
      {
        nombre: 'ether12-CMFurukawa',
        ipGateway: '10.5.56.1',
        subred: '10.5.56.0/21',
        interfaceName: 'ether12',
        tipoInterfaz: 'ether',
        activa: false
      }
    ]
  };

  for (const [nombreTorre, antenas] of Object.entries(antenasPorTorre)) {
    const torre = await prisma.torre.findFirst({
      where: { nombre: nombreTorre }
    });

    if (!torre) {
      console.log(`⚠️  Torre ${nombreTorre} no encontrada`);
      continue;
    }

    for (const antenaData of antenas) {
      let antena = await prisma.antena.findFirst({
        where: {
          nombre: antenaData.nombre,
          torreId: torre.id
        }
      });

      if (!antena) {
        antena = await prisma.antena.create({
          data: {
            ...antenaData,
            torreId: torre.id
          }
        });
        console.log(`  📡 ${antenaData.nombre}`);
      }
    }
  }

  console.log('✅ Seeding completado');
}

seed()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });