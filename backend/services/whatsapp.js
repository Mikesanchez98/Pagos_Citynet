// backend/services/whatsapp.js
const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID, 
  process.env.TWILIO_AUTH_TOKEN
);

const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; 

// Función reutilizable para construir el mensaje
const construirMensaje = (cliente, deudaTotal) => {
  return `Hola *${cliente.nombre}*, te saludamos de *Citynet*. 🌐\n\nTe recordamos que presentas un saldo pendiente de *$${deudaTotal}* correspondiente a tu servicio de internet (Día de cobro: ${cliente.diaCobro}).\n\nPuedes realizar tu pago vía transferencia, OXXO o en nuestras oficinas.\n\n_Si ya realizaste tu pago, por favor omite este mensaje. ¡Gracias!_`;
};

// Servicio para enviar el mensaje a través de la API de Twilio
const enviarMensajeTwilio = async (cliente, deudaTotal) => {
  const numeroLimpio = String(cliente.telefono).replace(/\D/g, '');
  if (numeroLimpio.length === 0) throw new Error('Número de teléfono inválido');

  const numeroFinal = numeroLimpio.length === 10 ? `52${numeroLimpio}` : numeroLimpio;
  const destinoWhatsapp = `whatsapp:+${numeroFinal}`;
  
  const mensaje = construirMensaje(cliente, deudaTotal);

  return await twilioClient.messages.create({
    body: mensaje,
    from: twilioWhatsAppNumber,
    to: destinoWhatsapp
  });
};

module.exports = {
  enviarMensajeTwilio
};