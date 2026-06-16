// backend/scripts/migrar-passwords.js
// Ejecutar UNA SOLA VEZ para hashear contraseñas en texto plano.
// Después de ejecutarlo, este script ya no tiene efecto (detecta hashes y los omite).
//
// Uso:
//   cd backend
//   node scripts/migrar-passwords.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// bcrypt siempre empieza con "$2b$" — así detectamos si ya está hasheada
const yaEstaHasheada = (password) => password?.startsWith('$2b$') || password?.startsWith('$2a$');

async function migrarPasswords() {
  console.log('🔐 Iniciando migración de contraseñas...\n');

  const usuarios = await prisma.usuario.findMany({
    select: { id: true, email: true, password: true }
  });

  console.log(`📋 Total de usuarios encontrados: ${usuarios.length}\n`);

  let migrados = 0;
  let omitidos = 0;
  let errores = 0;

  for (const usuario of usuarios) {
    if (yaEstaHasheada(usuario.password)) {
      console.log(`⏭️  [${usuario.email}] Ya tiene hash — omitido`);
      omitidos++;
      continue;
    }

    try {
      const hash = await bcrypt.hash(usuario.password, SALT_ROUNDS);
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { password: hash }
      });
      console.log(`✅ [${usuario.email}] Migrado correctamente`);
      migrados++;
    } catch (error) {
      console.error(`❌ [${usuario.email}] Error: ${error.message}`);
      errores++;
    }
  }

  console.log(`
╔════════════════════════════════════╗
║        MIGRACIÓN COMPLETADA        ║
╠════════════════════════════════════╣
║  ✅ Migrados : ${String(migrados).padEnd(20)}║
║  ⏭️  Omitidos : ${String(omitidos).padEnd(20)}║
║  ❌ Errores  : ${String(errores).padEnd(20)}║
╚════════════════════════════════════╝
  `);

  await prisma.$disconnect();
}

migrarPasswords().catch(async (e) => {
  console.error('Error fatal:', e);
  await prisma.$disconnect();
  process.exit(1);
});