// src/pages/Dashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  // Datos simulados (Hardcoded) para la Fase 1.
  // En la Fase 2, estos datos llegarán desde tu backend (Node.js/Prisma).
  const clienteData = {
    nombre: "Juan Pérez",
    plan: "Hogar 20 Mbps",
    ip: "10.20.30.45",
    estado: "activo", // 'activo' o 'suspendido'
    montoPendiente: 550.00,
    fechaVencimiento: "05 de Abril, 2026",
    facturaPagada: false
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      
      {/* Navbar Superior */}
      <nav className="bg-primary text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📡</span>
          <span className="font-bold text-lg tracking-wide">Citynet</span>
        </div>
        <button 
            onClick={() => navigate('/login')}
            className="text-sm font-medium bg-blue-700/50 hover:bg-blue-800 px-3 py-1.5 rounded-md transition-colors">
          Cerrar Sesión
        </button>
      </nav>

      {/* Contenedor Principal */}
      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
        
        {/* Saludo */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hola, {clienteData.nombre}</h1>
          <p className="text-slate-500 text-sm">Resumen de tu cuenta de internet</p>
        </div>

        {/* Tarjeta 1: Estado del Servicio (Técnico) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Plan Contratado</p>
            <p className="font-bold text-slate-800">{clienteData.plan}</p>
            <p className="text-xs text-slate-500 mt-1">IP: {clienteData.ip}</p>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Estatus</span>
            {clienteData.estado === 'activo' ? (
              <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm font-semibold">Activo</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-sm font-semibold">Suspendido</span>
              </div>
            )}
          </div>
        </div>

        {/* Tarjeta 2: Resumen Financiero y Botón de Pago */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
          <div className="p-6 text-center border-b border-slate-50">
            <p className="text-slate-500 font-medium mb-2">Total a Pagar</p>
            <h2 className="text-5xl font-extrabold text-slate-800 mb-2">
              ${clienteData.montoPendiente.toFixed(2)} <span className="text-xl text-slate-400 font-normal">MXN</span>
            </h2>
            <p className="text-sm text-slate-500">
              Vence el: <span className="font-semibold text-slate-700">{clienteData.fechaVencimiento}</span>
            </p>
          </div>
          
          <div className="p-6 bg-slate-50/50">
            {clienteData.facturaPagada ? (
              <div className="w-full py-4 text-center text-green-700 font-bold bg-green-100 rounded-xl border border-green-200">
                ¡Gracias! Tu recibo está pagado.
              </div>
            ) : (
              <button 
                onClick={() => navigate('/pagar')}
                className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200/50 transition-all active:scale-[0.98] text-lg flex items-center justify-center gap-2">
                <span>💳</span> PAGAR AHORA
              </button>
            )}
          </div>
        </div>

        {/* Historial Rápido (Opcional visualmente) */}
        <div className="pt-4">
          <h3 className="text-slate-700 font-semibold mb-3">Último movimiento</h3>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">📄</div>
              <div>
                <p className="font-medium text-slate-700">Recibo de Marzo</p>
                <p className="text-slate-400 text-xs">Pagado con Tarjeta</p>
              </div>
            </div>
            <span className="font-bold text-slate-700">$550.00</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;