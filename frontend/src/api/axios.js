import axios from 'axios';

// 1. Validamos de forma estricta si estamos en entorno de desarrollo local
const esLocal = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// 2. Asignamos la URL base correspondiente asegurando el protocolo correcto
const API_URL = esLocal
  ? 'http://127.0.0.1:3001/api'                // Tu backend local
  : 'https://pagos-citynet.vercel.app/api';    // Tu backend de Vercel (Asegúrate que sea tu URL exacta)

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 💡 DEBUGEAR EN CONSOLA: Esto te dirá exactamente a dónde está apuntando tu app hoy
console.log("🚀 Axios está apuntando a:", API_URL);

export default api;