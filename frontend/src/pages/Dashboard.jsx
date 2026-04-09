// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoCitynet from '../assets/logo-citynet-antiguo.png'; 
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:3001/api/cliente/perfil', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setDatos(response.data);
      } catch (error) {
        console.error('Error al cargar datos del cliente:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // --- NUEVA FUNCIÓN PARA OPENPAY ---
  const handlePagar = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3001/api/pagos/crear-checkout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Error al generar pago:", error);
      alert("No se pudo generar el enlace de pago. Verifica que tengas facturas pendientes.");
    }
  };
  // ----------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Cargando tu portal...</p>
        </div>
      </div>
    );
  }

  // Formatear la fecha para el diseño anterior
  const fechaVencimientoFormateada = datos?.vencimiento 
    ? new Date(datos.vencimiento).toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'long'
      })
    : "Sin adeudos";

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      
      {/* Navbar Superior (Diseño Original con fondo Azul) */}
      <nav className="bg-primary text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2">
            {/* Usamos un filtro brightness-0 invert para que el logo negro se vea blanco en el fondo azul */}
            <img src={logoCitynet} alt="Logo Citynet" className="h-12 object-contain brightness-0 invert" />
        </div>
        <button 
            onClick={handleLogout}
            className="text-sm font-medium bg-blue-700/50 hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors border border-blue-400/30">
          Cerrar Sesión
        </button>
      </nav>

      {/* Contenedor Principal */}
      <div className="max-w-3xl mx-auto px-4 mt-8 space-y-6">
        
        {/* Saludo y ID de Cliente */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Hola, {datos?.nombre}</h1>
          <p className="text-slate-500 text-sm font-medium">Número de Cliente: <span className="text-primary font-bold">{datos?.numCliente}</span></p>
        </div>

        {/* Tarjeta 1: Estado del Servicio (Técnico) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Plan Contratado</p>
            <p className="font-extrabold text-slate-800 text-xl">{datos?.plan || 'Básico'}</p>
            <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono uppercase">IP asignada</span>
                <p className="text-sm font-mono text-blue-600 font-semibold">{datos?.ip || '0.0.0.0'}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Estatus</span>
            {datos?.estado?.toLowerCase() === 'activo' ? (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full border border-green-200">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm font-bold uppercase">Activo</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-1.5 rounded-full border border-red-200">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-sm font-bold uppercase">Suspendido</span>
              </div>
            )}
          </div>
        </div>

        {/* Tarjeta 2: Resumen Financiero (El diseño grande que te gustaba) */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8 text-center border-b border-slate-50">
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-3">Total a Pagar</p>
            <div className="flex items-center justify-center gap-1">
                <span className="text-2xl font-bold text-slate-400 self-start mt-2">$</span>
                
                {/* ELIMINA CUALQUIER NÚMERO QUE ESTÉ AQUÍ ESCRITO A MANO */}
                <h2 className="text-6xl font-black text-slate-800 tracking-tighter">
                    {Number(datos?.montoPendiente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </h2>
                
                <span className="text-lg text-slate-400 font-bold ml-2">MXN</span>
            </div>
            
            <div className="mt-4 inline-block bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                <p className="text-sm text-slate-500 font-medium">
                  Próximo vencimiento: <span className="font-bold text-slate-800">{fechaVencimientoFormateada}</span>
                </p>
            </div>
          </div>
          
          <div className="p-6 bg-slate-50/50">
            {datos?.montoPendiente <= 0 ? (
              <div className="w-full py-4 text-center text-green-700 font-bold bg-green-100/50 rounded-2xl border border-green-200 flex items-center justify-center gap-2">
                ✨ ¡Tu cuenta está al día! No tienes pagos pendientes.
              </div>
            ) : (
              <button 
                onClick={handlePagar} /* <--- AQUÍ CAMBIÉ EL onClick POR handlePagar */
                className="w-full bg-primary hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-lg shadow-blue-200/50 transition-all active:scale-[0.98] text-xl flex items-center justify-center gap-3">
                💳 PAGAR AHORA
              </button>
            )}
          </div>
        </div>

        {/* Historial Rápido (Lógica Condicional Aplicada) */}
        <div className="pt-2">
          <h3 className="text-slate-800 font-bold mb-4 ml-1">Estado de Cuenta</h3>
          <div className={`p-5 rounded-2xl shadow-sm border flex justify-between items-center transition-hover ${datos?.montoPendiente > 0 ? 'bg-white border-slate-100 hover:border-red-200' : 'bg-green-50 border-green-100'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${datos?.montoPendiente > 0 ? 'bg-blue-50' : 'bg-green-100'}`}>
                {datos?.montoPendiente > 0 ? '📄' : '✅'}
              </div>
              <div>
                <p className={`font-bold ${datos?.montoPendiente > 0 ? 'text-slate-700' : 'text-green-800'}`}>
                  {datos?.montoPendiente > 0 ? 'Pago de Mensualidad' : 'Mensualidad Cubierta'}
                </p>
                <p className={`${datos?.montoPendiente > 0 ? 'text-slate-400' : 'text-green-600'} text-xs font-medium`}>Servicio de Internet Fibra</p>
              </div>
            </div>
            <div className="text-right">
                <p className={`font-black ${datos?.montoPendiente > 0 ? 'text-slate-700' : 'text-green-700'}`}>
                  ${Number(datos?.montoPendiente || 0).toFixed(2)}
                </p>
                {datos?.montoPendiente > 0 ? (
                  <p className="text-[10px] text-red-500 font-bold uppercase">Pendiente</p>
                ) : (
                  <p className="text-[10px] text-green-600 font-bold uppercase">Pagado</p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;