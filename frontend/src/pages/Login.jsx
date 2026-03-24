// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Intentando login con:", formData);
    // Aquí irá la lógica para conectar con tu backend local
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📡</span> 
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Portal de Clientes</h1>
          <p className="text-slate-500 mt-2">Ingresa para gestionar tu internet</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input de Identificador */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Correo o Número de Cliente
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Ej: 10452"
              onChange={(e) => setFormData({...formData, identifier: e.target.value})}
            />
          </div>

          {/* Input de Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <p className="text-sm text-slate-500">
            ¿Problemas con tu acceso? <br />
            <span className="text-primary font-medium cursor-pointer">Contacta a soporte técnico</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;