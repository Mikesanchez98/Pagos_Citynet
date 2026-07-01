const cron = require('node-cron');
const sincronizacion = require('./sincronizacion-mikrotik');
const corteAutomatico = require('./corte-automatico');

function iniciarCronSincronizacion() {
  const jobSincronizacion = cron.schedule('0 * * * *', async () => {
    try {
      console.log('📡 Ejecutando sincronización periódica...');
      await sincronizacion.sincronizarServicios();
    } catch (error) {
      console.error('❌ Error en cron sincronización:', error.message);
    }
  });

  const jobCorte = cron.schedule('0 0 * * *', async () => {
    console.log('\n🚨 ===== INICIO DE CORTE AUTOMÁTICO DIARIO =====');
    try {
      await corteAutomatico.suspenderServiciosVencidos();
    } catch (error) {
      console.error('❌ Error en cron corte:', error.message);
    }
    console.log('🚨 ===== FIN DE CORTE AUTOMÁTICO DIARIO =====\n');
  });

  console.log('✅ Cron de sincronización iniciado (cada hora)');
  console.log('✅ Cron de corte automático iniciado (00:00 diarios)');

  return { jobSincronizacion, jobCorte };
}

module.exports = iniciarCronSincronizacion;