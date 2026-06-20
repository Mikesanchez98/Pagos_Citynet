const cron = require('node-cron');
const sincronizacion = require('./sincronizacion-mikrotik');

function iniciarCronSincronizacion() {
  const job = cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('📡 Ejecutando sincronización periódica...');
      await sincronizacion.sincronizarServicios();
    } catch (error) {
      console.error('❌ Error en cron:', error.message);
    }
  });

  console.log('✅ Cron de sincronización iniciado (cada 5 minutos)');
  return job;
}

module.exports = iniciarCronSincronizacion;