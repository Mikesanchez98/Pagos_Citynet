// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // 1. Importamos Axios
import logoCitynet from '../assets/logo-citynet-antiguo.png';

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 2. Petición real a tu servidor de Node.js
      const response = await axios.post('http://localhost:3001/api/auth/login', {
        identifier, // Puede ser email o numCliente
        password
      });

      // 3. Si el login es exitoso, guardamos el Token y los datos del usuario
      // Usamos localStorage para que la sesión no se cierre al refrescar
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.usuario));

      // 4. ¡Bienvenidos al Dashboard!
      if (response.data.usuario.rol === 'ADMIN') {
        navigate('/admin'); // Al panel de control
      } else {
        navigate('/dashboard'); // Al portal de cliente
      }

    } catch (err) {
      // Manejo de errores (Credenciales incorrectas o servidor caído)
      setError(err.response?.data?.error || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
        
        <div className="text-center mb-10">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-sm border border-slate-100">
            <img src={logoCitynet} alt="Logo Citynet" className="h-auto w-auto max-w-[85%] object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Portal de Clientes</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Mensaje de Error Visual */}
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 animate-bounce">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Correo electrónico o número de cliente</label>
            <input 
              type="text" 
              required
              className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="ej. cliente@citynet.com o CT-1001"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Contraseña</label>
            <input 
              type="password" 
              required
              className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-700 shadow-blue-200'}`}
          >
            {loading ? 'VERIFICANDO...' : 'INGRESAR'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;