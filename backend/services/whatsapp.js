// backend/services/whatsapp.js
const twilio = require('twilio');

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.warn('⚠️  [Twilio] TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no están configurados.');
}

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Asegurar que el número de origen tenga el prefijo whatsapp:
const rawFrom = process.env.TWILIO_WHATSAPP_NUMBER || '';
const twilioWhatsAppFrom = rawFrom.startsWith('whatsapp:') ? rawFrom : `whatsapp:${rawFrom}`;

const construirMensaje = (cliente, deudaTotal) => {
  return `Hola *${cliente.nombre}*, te saludamos de *Citynet*. 🌐\n\nTe recordamos que presentas un saldo pendiente de *$${deudaTotal}* correspondiente a tu servicio de internet (Grupo de cobro: ${cliente.diaCobro}).\n\nPuedes realizar tu pago vía transferencia, OXXO o en nuestras oficinas.\n\n_Si ya realizaste tu pago, por favor omite este mensaje. ¡Gracias por tu preferencia!_`;
};

const enviarMensajeTwilio = async (cliente, deudaTotal) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio no configurado. Revisa TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en el .env');
  }

  const numeroLimpio = String(cliente.telefono || '').replace(/\D/g, '');
  if (numeroLimpio.length === 0) {
    throw new Error(`El cliente ${cliente.nombre} no tiene número de teléfono registrado.`);
  }

  // Agregar lada de México si es un número local de 10 dígitos
  const numeroFinal = numeroLimpio.length === 10 ? `52${numeroLimpio}` : numeroLimpio;
  const destinoWhatsapp = `whatsapp:+${numeroFinal}`;

  const mensaje = construirMensaje(cliente, deudaTotal);

  try {
    const result = await twilioClient.messages.create({
      body: mensaje,
      from: twilioWhatsAppFrom,
      to: destinoWhatsapp
    });
    console.log(`✅ [Twilio] Mensaje enviado a ${cliente.nombre} (${destinoWhatsapp}) — SID: ${result.sid}`);
    return result;
  } catch (error) {
    console.error(`❌ [Twilio] Error al enviar a ${cliente.nombre} (${destinoWhatsapp}):`, error.message);
    throw error;
  }
};

module.exports = { enviarMensajeTwilio };