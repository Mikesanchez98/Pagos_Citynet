const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Conexión simple a MikroTik API
const net = require('net');

async function conectarYObtenerUsuarios() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(
      parseInt(process.env.MIKROTIK_PORT) || 8728,
      process.env.MIKROTIK_HOST || '192.168.1.1'
    );

    let buffer = '';
    let conectado = false;

    socket.on('connect', () => {
      console.log('✅ Conectado al router MikroTik');
      conectado = true;
      
      // Enviar comando para obtener usuarios PPPoE
      socket.write('/ppp/secret/print\n');
    });

    socket.on('data', (data) => {
      buffer += data.toString();
    });

    socket.on('end', () => {
      socket.destroy();
      
      if (conectado && buffer.length > 0) {
        // Parsear respuesta (formato simplificado)
        const usuarios = parsearRespuestaUsuarios(buffer);
        resolve(usuarios);
      } else {
        resolve([]);
      }
    });

    socket.on('error', (error) => {
      console.warn('⚠️  No se pudo conectar directamente:', error.message);
      socket.destroy();
      resolve([]); // Retornar vacío para usar modo simulado
    });

    setTimeout(() => {
      socket.destroy();
      if (!conectado) {
        resolve([]);
      }
    }, 5000);
  });
}

function parsearRespuestaUsuarios(buffer) {
  // Intenta extraer usuarios del buffer
  const usuarios = [];
  
  // Búsqueda simple de patrón name= password=
  const regex = /name=([^\s]+)\s+password=([^\s]+)/g;
  let match;
  
  while ((match = regex.exec(buffer)) !== null) {
    usuarios.push({
      name: match[1],
      password: match[2]
    });
  }
  
  return usuarios;
}

function crearUsuariosSimulados(cantidad = 600) {
  // Si no se conecta a MikroTik, crear usuarios de ejemplo
  const usuarios = [];
  
  for (let i = 1; i <= cantidad; i++) {
    usuarios.push({
      name: `cliente${i.toString().padStart(4, '0')}`,
      password: `pass${i}`
    });
  }
  
  return usuarios;
}

async function importarMasivo() {
  console.log('🚀 IMPORTACIÓN MASIVA DE CLIENTES DE MIKROTIK\n');

  const config = {
    host: process.env.MIKROTIK_HOST || '192.168.1.1',
    user: process.env.MIKROTIK_USER || 'citynet_api',
    port: parseInt(process.env.MIKROTIK_PORT) || 8728
  };

  console.log(`📡 Conectando a ${config.host}:${config.port}`);
  console.log(`👤 Usuario: ${config.user}\n`);

  try {
    // Intentar conexión real a MikroTik
    let usuarios = await conectarYObtenerUsuarios();

    if (usuarios.length === 0) {
      console.log('⚠️  No se pudo obtener usuarios de MikroTik directamente');
      console.log('🔄 Usando MODO SIMULADO con 600 usuarios de ejemplo\n');
      usuarios = crearUsuariosSimulados(600);
    } else {
      console.log(`✅ Obtenidos ${usuarios.length} usuarios de MikroTik\n`);
    }

    // Importar usuarios
    await importarUsuarios(usuarios);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function importarUsuarios(usuarios) {
  console.log(`📥 Importando ${usuarios.length} usuarios...\n`);

  let importados = 0;
  let existentes = 0;
  let errores = 0;

  // Obtener antenas para distribución
  const antenas = await prisma.antena.findMany({
    include: { torre: true }
  });

  if (antenas.length === 0) {
    console.error('❌ No hay antenas en la BD. Ejecuta seed-torres.js primero');
    return;
  }

  console.log(`📡 Distribuyendo entre ${antenas.length} antenas\n`);

  for (let i = 0; i < usuarios.length; i++) {
    try {
      const usuario = usuarios[i];
      const numCliente = usuario.name;

      // Verificar si existe
      const existe = await prisma.cliente.findUnique({
        where: { numCliente }
      });

      if (existe) {
        existentes++;
        continue;
      }

      // Crear usuario
      const usuarioDb = await prisma.usuario.create({
        data: {
          email: numCliente.toLowerCase(),
          password: await bcrypt.hash(usuario.password, 10),
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
          usuarioId: usuarioDb.id
        }
      });

      // Asignar antena (distribución round-robin)
      const antenaIndex = i % antenas.length;
      const antena = antenas[antenaIndex];

      // Crear servicio
      await prisma.servicio.create({
        data: {
          estado: 'ACTIVO',
          direccionIp: '0.0.0.0',
          clienteId: cliente.id,
          antenaId: antena.id,
          torreId: antena.torreId,
          paqueteId: 'fibra-gpon-100m'
        }
      });

      importados++;

      if ((i + 1) % 100 === 0) {
        console.log(`  ✅ ${i + 1}/${usuarios.length} importados...`);
      }

    } catch (error) {
      if (error.code !== 'P2002') {
        errores++;
      }
    }
  }

  console.log('\n📊 RESUMEN FINAL:');
  console.log(`  ✅ Importados: ${importados}`);
  console.log(`  ⚠️  Ya existían: ${existentes}`);
  console.log(`  ❌ Errores: ${errores}`);
  console.log(`  📈 Total procesados: ${importados + existentes + errores}\n`);
}

importarMasivo();