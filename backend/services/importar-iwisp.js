const XLSX    = require('xlsx');
const bcrypt  = require('bcryptjs');
const path    = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma  = new PrismaClient();

const EXCEL_PATH   = path.join(__dirname, '../scripts/IWM_clientes_20260608.xlsx');
const HEADER_ROW   = 5;  // índice de la fila de encabezados (0-based)
const DATA_START   = 7;  // primera fila con datos

// Columnas (índice del array, primer elemento es null)
const COL = {
  ID:         1,
  NOMBRE:     2,
  TELEFONO_FIJO:   19,
  TELEFONO_CEL:    20,
  PRIMER_PAGO:     22,
  EMAIL:      24,
  DOMICILIO:  13,
  CONEXIONES: 16,  // plan(es), puede ser "AIR MAX, AIR Advance"
  CELULAS:    17,  // torre(s), puede ser "VILLAIZCALLI, PRIMAVERA"
  ESTADO:     18,  // "Habilitado" | "Suspendido"
};

class ImportarIwispService {

  // Extrae la velocidad en Mbps de strings como "20M", "20 Mbps", "AIR 20M", "Fibra 20 Mbps"
  _extraerMbps(texto) {
    if (!texto) return null;
    const m = String(texto).match(/(\d+)\s*[Mm](?:bps?)?/);
    return m ? parseInt(m[1]) : null;
  }

  // Extrae el número de grupo de strings como "GPO 1", "Grupo1", "GRUPO 2", "Torre 3"
  _extraerNumeroGrupo(texto) {
    if (!texto) return null;
    const m = String(texto).match(/\d+/);
    return m ? parseInt(m[0]) : null;
  }

  // Busca paquete: exact → por Mbps → partial
  async _buscarPaquete(nombrePlan, paquetes) {
    if (!nombrePlan) return null;
    const n = nombrePlan.trim().toLowerCase();

    const exact = paquetes.find(p => p.nombre.toLowerCase() === n);
    if (exact) return exact;

    const mbps = this._extraerMbps(nombrePlan);
    if (mbps !== null) {
      const porMbps = paquetes.find(p => this._extraerMbps(p.nombre) === mbps);
      if (porMbps) return porMbps;
    }

    return (
      paquetes.find(p => p.nombre.toLowerCase().includes(n)) ||
      paquetes.find(p => n.includes(p.nombre.toLowerCase())) ||
      null
    );
  }

  // Busca torre: exact → por número de grupo → partial
  async _buscarTorre(nombreCelula, torres) {
    if (!nombreCelula) return null;
    const n = nombreCelula.trim().toLowerCase();

    const exact = torres.find(t => t.nombre.toLowerCase() === n);
    if (exact) return exact;

    const num = this._extraerNumeroGrupo(nombreCelula);
    if (num !== null) {
      const porNum = torres.find(t => this._extraerNumeroGrupo(t.nombre) === num);
      if (porNum) return porNum;
    }

    return (
      torres.find(t => t.nombre.toLowerCase().includes(n)) ||
      torres.find(t => n.includes(t.nombre.toLowerCase())) ||
      null
    );
  }

  _primerValor(campo) {
    if (!campo) return null;
    return String(campo).split(',')[0].trim();
  }

  _formatearTelefono(tel) {
    if (!tel) return null;
    return String(tel).replace(/\D/g, '').slice(0, 15) || null;
  }

  async importar(paqueteIdDefault = null) {
    console.log('\n📊 ===== IMPORTACIÓN IWISP =====\n');

    const wb   = XLSX.readFile(EXCEL_PATH);
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const rows = data.slice(DATA_START).filter(r => r[COL.ID]);

    const [paquetes, torres] = await Promise.all([
      prisma.paquete.findMany(),
      prisma.torre.findMany()
    ]);

    console.log(`📋 ${rows.length} clientes | ${paquetes.length} paquetes | ${torres.length} torres`);
    console.log(`   Paquetes DB: ${paquetes.map(p => `"${p.nombre}"`).join(', ')}`);
    console.log(`   Torres DB:   ${torres.map(t => `"${t.nombre}"`).join(', ')}\n`);

    let creados      = 0;
    let actualizados = 0;
    let errores      = 0;
    const sinPlan    = new Set();
    const sinTorre   = new Set();
    const problemas  = [];

    for (const row of rows) {
      try {
        const numCliente  = String(row[COL.ID]).trim();
        const nombre      = String(row[COL.NOMBRE] || '').trim();
        const email       = row[COL.EMAIL]        ? String(row[COL.EMAIL]).trim().toLowerCase() : null;
        const telefono    = this._formatearTelefono(row[COL.TELEFONO_CEL] || row[COL.TELEFONO_FIJO]);
        const domicilio   = row[COL.DOMICILIO]    ? String(row[COL.DOMICILIO]).trim() : null;
        const estadoRaw   = row[COL.ESTADO]       ? String(row[COL.ESTADO]).trim() : 'Habilitado';
        const estadoSrv   = estadoRaw === 'Habilitado' ? 'ACTIVO' : 'SUSPENDIDO';

        // Tomar solo el primer plan y primera torre si hay múltiples
        const planNombre   = this._primerValor(row[COL.CONEXIONES]);
        const torreNombre  = this._primerValor(row[COL.CELULAS]);

        // Buscar paquete y torre
        const paquete = await this._buscarPaquete(planNombre, paquetes);
        const torre   = await this._buscarTorre(torreNombre, torres);
        const paqueteId = paquete?.id || paqueteIdDefault;
        const torreId   = torre?.id   || null;

        if (!paquete && planNombre)  sinPlan.add(planNombre);
        if (!torre   && torreNombre) sinTorre.add(torreNombre);

        if (!paqueteId) {
          problemas.push({ numCliente, nombre, razon: `Sin paquete: "${planNombre}"` });
          errores++;
          continue;
        }

        // ── Buscar si ya existe el cliente ────────────────────────────────────
        const clienteExistente = await prisma.cliente.findUnique({
          where: { numCliente },
          include: { servicios: true, usuario: true }
        });

        if (clienteExistente) {
          // Actualizar datos del cliente
          await prisma.cliente.update({
            where: { numCliente },
            data: {
              nombre,
              ...(email    && { email }),
              ...(telefono && { telefono }),
            }
          });

          // Actualizar también el email del Usuario si cambió
          if (email && clienteExistente.usuario?.email?.endsWith('@citynet.local')) {
            await prisma.usuario.update({
              where: { id: clienteExistente.usuarioId },
              data: { email }
            }).catch(() => {}); // ignorar si el email ya está tomado
          }

          // Actualizar el primer Servicio
          const servicio = clienteExistente.servicios[0];
          if (servicio) {
            await prisma.servicio.update({
              where: { id: servicio.id },
              data: {
                estado:    estadoSrv,
                paqueteId,
                ...(torreId   && { torreId }),
                ...(domicilio && { direccion: domicilio }),
              }
            });
          }

          actualizados++;
          continue;
        }

        // ── Cliente nuevo ─────────────────────────────────────────────────────
        const emailFinal = email || `cliente${numCliente}@citynet.local`;

        // Verificar que el email no esté tomado
        const emailUsado = await prisma.usuario.findUnique({ where: { email: emailFinal } });
        const emailUsar  = emailUsado
          ? `c${numCliente}_${Date.now()}@citynet.local`
          : emailFinal;

        const passHash = await bcrypt.hash(numCliente, 10);

        const usuario = await prisma.usuario.create({
          data: { email: emailUsar, password: passHash, rol: 'CLIENTE' }
        });

        await prisma.cliente.create({
          data: {
            nombre,
            numCliente,
            email:    emailFinal,
            telefono: telefono || null,
            usuarioId: usuario.id,
            servicios: {
              create: {
                estado:    estadoSrv,
                paqueteId,
                torreId,
                direccion: domicilio || null,
              }
            }
          }
        });

        creados++;

      } catch (err) {
        const nc = String(row[COL.ID]);
        console.error(`❌ Error cliente #${nc}:`, err.message);
        problemas.push({ numCliente: nc, nombre: String(row[COL.NOMBRE] || ''), razon: err.message });
        errores++;
      }
    }

    const resumen = {
      total: rows.length,
      creados,
      actualizados,
      errores,
      sinPlan:  [...sinPlan],
      sinTorre: [...sinTorre],
      problemas
    };

    console.log('\n📊 RESUMEN IWISP:');
    console.log(`   Creados:      ${creados}`);
    console.log(`   Actualizados: ${actualizados}`);
    console.log(`   Errores:      ${errores}`);
    if (sinPlan.size)  console.log(`   Planes sin match:  ${[...sinPlan].join(', ')}`);
    if (sinTorre.size) console.log(`   Torres sin match: ${[...sinTorre].join(', ')}`);
    console.log();

    return resumen;
  }
}

module.exports = new ImportarIwispService();
