const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Conectar a MikroTik usando protocolo API
const api = require('node:net');

async function obtenerClientesDeMikrotik() {
  return new Promise((resolve, reject) => {
    const socket = api.createConnection({
      host: process.env.MIKROTIK_HOST || '192.168.1.1',
      port: parseInt(process.env.MIKROTIK_PORT) || 8728,
      timeout: 5000
    });

    let buffer = '';

    socket.on('connect', () => {
      console.log('✅ Conectado a MikroTik');
      // Enviar comando para obtener usuarios PPPoE
      socket.write('/ppp/secret/print\n');
    });

    socket.on('data', (data) => {
      buffer += data.toString();
    });

    socket.on('end', () => {
      // Parsear respuesta (simplificado)
      const usuarios = [];
      socket.destroy();
      resolve(usuarios);
    });

    socket.on('error', (error) => {
      console.error('❌ Error de conexión:', error.message);
      reject(error);
    });

    setTimeout(() => {
      socket.destroy();
      reject(new Error('Timeout'));
    }, 5000);
  });
}

async function importar() {
  console.log('🚀 Importación automática de clientes desde MikroTik\n');

  try {
    console.log(`📡 Conectando a ${process.env.MIKROTIK_HOST}:${process.env.MIKROTIK_PORT}`);
    
    // Por ahora, usar datos de prueba
    // En el futuro, aquí iría la conexión real a MikroTik
    
    const clientesParaImportar = [
      { numCliente: 'cityf2', password: 'city2314', antenaId: 5 },
      { numCliente: 'cityf3', password: 'city3314', antenaId: 5 },
      { numCliente: 'City121', password: 'city121', antenaId: 5 },
      { numCliente: 'Cliente10', password: 'cliente10', antenaId: 5 },
      { numCliente: 'cityf11', password: 'city11', antenaId: 5 },
      { numCliente: 'City13', password: 'city13', antenaId: 5 },
      { numCliente: 'citYTs', password: 'cityts', antenaId: 5 },
      { numCliente: 'ctyf5', password: 'ctyf5', antenaId: 5 },
      { numCliente: 'Mike', password: 'mike123', antenaId: 5 }
    ];

    console.log(`✅ Se encontraron ${clientesParaImportar.length} clientes\n`);
    console.log('📥 Importando...\n');

    let importados = 0;
    let existentes = 0;
    let errores = 0;

    for (const cliente of clientesParaImportar) {
      try {
        // Verificar si existe
        const existe = await prisma.cliente.findUnique({
          where: { numCliente: cliente.numCliente }
        });

        if (existe) {
          existentes++;
          console.log(`⚠️  ${cliente.numCliente} ya existe`);
          continue;
        }

        // Crear usuario
        const usuario = await prisma.usuario.create({
          data: {
            email: cliente.numCliente.toLowerCase(),
            password: await bcrypt.hash(cliente.password, 10),
            rol: 'CLIENTE'
          }
        });

        // Crear cliente
        const clienteNuevo = await prisma.cliente.create({
          data: {
            nombre: cliente.numCliente,
            numCliente: cliente.numCliente,
            email: `${cliente.numCliente}@citynet.local`,
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
            clienteId: clienteNuevo.id,
            antenaId: cliente.antenaId,
            torreId: 5, // DeltaMonti-Gpon
            paqueteId: '1'
          }
        });

        console.log(`✅ ${cliente.numCliente}`);
        importados++;

        if (importados % 100 === 0) {
          console.log(`   ${importados} clientes importados...`);
        }

      } catch (error) {
        if (error.code !== 'P2002') {
          console.error(`❌ ${cliente.numCliente}:`, error.message);
        }
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

importar();