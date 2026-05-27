const twilio = require('twilio');

// Estas credenciales te las da Twilio al crear tu cuenta gratuita
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const enviarWhatsAppFactura = async (telefonoCliente, nombreCliente, monto, vencimiento) => {
  try {
    const fechaFormateada = new Date(vencimiento).toLocaleDateString();
    
    // En Twilio, los números de WhatsApp llevan el prefijo 'whatsapp:'
    const mensaje = await client.messages.create({
      body: `Hola ${nombreCliente}, tu estado de cuenta de Citynet ha sido actualizado. Tienes un saldo a pagar de $${monto} MXN con vencimiento el ${fechaFormateada}.`,
      from: 'whatsapp:+14155238886', // Este es el número universal de pruebas de Twilio
      to: `whatsapp:+521${telefonoCliente}` // Asumiendo que es un número de México (+52)
    });

    console.log(`✅ WhatsApp enviado con éxito a ${telefonoCliente} (ID: ${mensaje.sid})`);
  } catch (error) {
    console.error(`❌ Error al enviar WhatsApp a ${telefonoCliente}:`, error);
  }
};

module.exports = { enviarWhatsAppFactura };