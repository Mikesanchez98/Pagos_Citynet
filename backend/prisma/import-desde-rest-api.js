const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Función para conectar a REST API de MikroTik
async function obtenerUsuariosDesdeREST() {
  try {
    const host = process.env.MIKROTIK_HOST || '192.168.1.1';
    const user = process.env.MIKROTIK_USER || 'citynet_api';
    const password = process.env.MIKROTIK_PASSWORD;
    
    // Probar puertos comunes
    const puertos = [8080, 8443, 80, 443];
    
    for (const puerto of puertos) {
      try {
        console.log(`📡 Intentando puerto ${puerto}...`);
        
        const url = `http://${host}:${puerto}/rest/ppp/secret`;
        
        // Autenticación básica
        const auth = Buffer.from(`${user}:${password}`).toString('base64');
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (response.ok) {
          console.log(`✅ Conectado en puerto ${puerto}`);
          const data = await response.json();
          return data;
        }
      } catch (error) {
        // Intentar siguiente puerto
        continue;
      }
    }

    throw new Error('No se pudo conectar a REST API en ningún puerto');

  } catch (error) {
    console.error('⚠️  Error REST API:', error.message);
    return null;
  }
}

async function importarDesdeREST() {
  console.log('🚀 IMPORTACIÓN DESDE REST API DE MIKROTIK\n');

  const host = process.env.MIKROTIK_HOST || '192.168.1.1';
  const user = process.env.MIKROTIK_USER || 'citynet_api';

  console.log(`📡 Conectando a ${host}`);
  console.log(`👤 Usuario: ${user}\n`);

  try {
    // Obtener usuarios desde REST API
    let usuarios = await obtenerUsuariosDesdeREST();

    if (!usuarios || usuarios.length === 0) {
      console.log('❌ No se pudo obtener usuarios desde REST API');
      console.log('💡 Verifica que:');
      console.log('   1. REST API esté habilitada en MikroTik');
      console.log('   2. Usuario citynet_api tenga permisos');
      console.log('   3. Firewall permita conexión\n');
      return;
    }

    console.log(`✅ Se encontraron ${usuarios.length} usuarios\n`);

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

  // Obtener antenas
  const antenas = await prisma.antena.findMany({
    include: { torre: true }
  });

  if (antenas.length === 0) {
    console.error('❌ No hay antenas. Ejecuta seed-torres.js primero');
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
  console.log(`  📈 Total: ${importados + existentes + errores}\n`);
}

importarDesdeREST();