const { PrismaClient } = require('@prisma/client');
const mikrotikService = require('./mikrotik');

const prisma = new PrismaClient();

class CorteAutomaticoService {
  async suspenderServiciosVencidos() {
    console.log('\n⏰ [Corte] Iniciando verificación de servicios vencidos...');

    try {
      const ahora = new Date();

      const servicios = await prisma.servicio.findMany({
        where: {
          estado: 'ACTIVO',
          facturas: {
            some: {
              pagada: false,
              vencimiento: {
                lt: ahora
              }
            }
          }
        },
        include: {
          cliente: true,
          paquete: true,
          facturas: {
            where: { pagada: false, vencimiento: { lt: ahora } }
          }
        }
      });

      if (servicios.length === 0) {
        console.log('✅ Ningún servicio vencido para suspender');
        return { suspendidos: 0, errores: 0 };
      }

      console.log(`📡 Encontrados ${servicios.length} servicios vencidos`);

      let suspendidos = 0;
      let errores = 0;

      for (const servicio of servicios) {
        try {
          if (servicio.mikrotikUser && process.env.MIKROTIK_PASSWORD !== 'mock') {
            try {
              await mikrotikService.deshabilitarUsuario(servicio.mikrotikUser);
              console.log(`✅ Usuario ${servicio.mikrotikUser} deshabilitado en MikroTik`);
            } catch (err) {
              console.warn(`⚠️  No se pudo deshabilitar en MikroTik: ${err.message}`);
            }
          } else if (servicio.mikrotikUser) {
            console.log(`🔄 [MOCK] Usuario ${servicio.mikrotikUser} sería deshabilitado`);
          }

          await prisma.servicio.update({
            where: { id: servicio.id },
            data: {
              estado: 'SUSPENDIDO',
              requiereReconexion: true
            }
          });

          try {
            await prisma.mikrotikLog.create({
              data: {
                accion: 'CORTE_AUTOMATICO',
                cliente: servicio.cliente.numCliente,
                router: 'LOCAL',
                estado: 'EXITOSO',
                error: null
              }
            });
          } catch (err) {
            // Ignorar error de log
          }

          console.log(`🔴 Servicio #${servicio.id} (${servicio.cliente.nombre}) SUSPENDIDO`);
          console.log(`   Deuda: $${servicio.facturas.reduce((sum, f) => sum + f.monto, 0)}`);
          suspendidos++;

        } catch (error) {
          console.error(`❌ Error suspendiendo servicio ${servicio.id}:`, error.message);
          errores++;
        }
      }

      console.log(`\n📊 Resumen: ${suspendidos} suspendidos, ${errores} errores\n`);
      return { suspendidos, errores };

    } catch (error) {
      console.error('❌ Error crítico en corte automático:', error);
      throw error;
    }
  }
}

module.exports = new CorteAutomaticoService();
