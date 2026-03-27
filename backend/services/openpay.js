// backend/services/openpay.js
const axios = require('axios');

// Configuramos la instancia de Axios para Openpay
const openpay = axios.create({
  baseURL: `https://sandbox-api.openpay.mx/v1/${process.env.OPENPAY_ID}`,
  auth: {
    username: process.env.OPENPAY_PRIVATE_KEY,
    password: '' // Openpay usa la llave como username y password vacío
  }
});

module.exports = openpay;