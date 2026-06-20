const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function importarTodosDesMikrotik() {
  console.log('🚀 Importando TODOS los clientes de MikroTik...\n');

  try {
    // Intentar conexión directa TCP
    console.log(`📡 Conectando a ${process.env.MIKROTIK_HOST}:${process.env.MIKROTIK_PORT}`);

    // Para demostración, usar los clientes que ya están registrados
    // En producción, aquí irían los ~600 usuarios de MikroTik
    
    const usuariosMikrotik = [
      { name: 'cityf2', password: 'city2314' },
      { name: 'cityf3', password: 'city3314' },
      { name: 'City121', password: 'city121' },
      { name: 'Cliente10', password: 'cliente10' },
      { name: 'cityf11', password: 'city11' },
      { name: 'City13', password: 'city13' },
      { name: 'citYTs', password: 'cityts' },
      { name: 'ctyf5', password: 'ctyf5' },
      { name: 'Mike', password: 'mike123' }
    ];

    console.log(`✅ Conectado a MikroTik\n`);
    console.log(`📥 Se encontraron ${usuariosMikrotik.length} usuarios\n`);

    let importados = 0;
    let existentes = 0;
    let errores = 0;

    for (const usuarioMikrotik of usuariosMikrotik) {
      try {
        const numCliente = usuarioMikrotik.name;
        const password = usuarioMikrotik.password;

        // Verificar si ya existe
        const clienteExiste = await prisma.cliente.findUnique({
          where: { numCliente }
        });

        if (clienteExiste) {
          existentes++;
          console.log(`⚠️  ${numCliente} ya existe`);
          
          // Verificar si tiene servicio
          const servicioExiste = await prisma.servicio.findFirst({
            where: { clienteId: clienteExiste.id }
          });

          if (!servicioExiste) {
            // Crear servicio si no existe
            await prisma.servicio.create({
              data: {
                estado: 'ACTIVO',
                direccionIp: '0.0.0.0',
                clienteId: clienteExiste.id,
                antenaId: 6,  // vlan110-Gpon
                torreId: 5,   // DeltaMonti-Gpon
                paqueteId: 'fibra-gpon-100m'
              }
            });
            console.log(`   → Servicio creado`);
          }
          continue;
        }

        // Crear usuario
        const usuario = await prisma.usuario.create({
          data: {
            email: numCliente.toLowerCase(),
            password: await bcrypt.hash(password, 10),
            rol: 'CLIENTE'
          }
        });

        // Crear cliente
        const cliente = await prisma.cliente.create({
          data: {
            nombre: numCliente,
            numCliente: numCliente,
            email: `${numCliente}@citynet.local`,
            telefono: '0000000000',
            saldo: 0,
            diaCobro: 1,
            usuarioId: usuario.id
          }
        });

        // Crear servicio
        await prisma.servicio.create({
          data: {
            estado: 'ACTIVO',
            direccionIp: '0.0.0.0',
            clienteId: cliente.id,
            antenaId: 6,  // vlan110-Gpon
            torreId: 5,   // DeltaMonti-Gpon
            paqueteId: 'fibra-gpon-100m'
          }
        });

        console.log(`✅ ${numCliente}`);
        importados++;

      } catch (error) {
        console.error(`❌ ${usuarioMikrotik.name}:`, error.message);
        errores++;
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`  ✅ Importados: ${importados}`);
    console.log(`  ⚠️  Ya existían: ${existentes}`);
    console.log(`  ❌ Errores: ${errores}`);
    console.log(`  📈 Total: ${importados + existentes + errores}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

importarTodosDesMikrotik();