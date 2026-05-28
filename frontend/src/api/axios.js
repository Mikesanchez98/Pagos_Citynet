import axios from 'axios';

// Detecta automáticamente si el proyecto corre en localhost o en producción
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'  // 💻 Dirección local para desarrollo
  : 'https://pagos-citynet.vercel.app/api'; // 🌐 Tu backend de Vercel para producción

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

export default api;