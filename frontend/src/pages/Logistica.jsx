// src/pages/Logistica.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios'; 
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import logoCitynet from '../assets/logo-citynet-antiguo.png';

const Logistica = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTiempo, setFiltroTiempo] = useState('MES'); // HOY, SEMANA, MES, TODOS

  // 1. Cargar Estadísticas Generales (Protegido con useCallback para evitar re-renders innecesarios)
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const res = await api.get('/admin/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
      if (error.response?.status === 401) navigate('/login'); // Redirigir si el token expiró
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // 2. Cargar Historial de Pagos con Filtro
  const fetchPagos = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await api.get(`/admin/pagos/historial?filtro=${filtroTiempo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPagos(res.data || []);
    } catch (error) {
      console.error("Error al cargar el historial de pagos:", error);
    }
  }, [filtroTiempo]);

  // Disparador de Carga Inicial
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Disparador cuando cambia el filtro de tiempo
  useEffect(() => {
    fetchPagos();
  }, [fetchPagos]);

  if (loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center font-black text-slate-500 uppercase tracking-widest text-xs animate-pulse">
          Cargando Métricas de Logística...
        </div>
      </div>
    );
  }

  // Datos para la gráfica unificados con salvavidas por si vienen vacíos (|| 0)
  const chartData = [
    {
      name: 'Balance del Mes',
      Proyectado: stats.ingresosProyectados || 0,
      Recaudado: stats.ingresosReales || 0,
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center px-8">
        <div className="flex items-center gap-4">
          <img src={logoCitynet} alt="Logo" className="h-10 brightness-0 invert" />
          <span className="text-[10px] font-black tracking-[0.3em] text-purple-400 border-l border-slate-700 pl-4 uppercase">Centro de Logística</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/admin')} className="text-[10px] font-black px-4 py-2 rounded-xl border border-slate-500/30 text-slate-300 hover:bg-slate-800 transition-all uppercase">Volver al Panel</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto mt-8 px-4">
        <h1 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-wider">Resumen General</h1>

        {/* TARJETAS DE MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Clientes</h3>
            <p className="text-5xl font-black text-slate-800">{stats.totalClientes || 0}</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado del Servicio</h3>
            <div className="flex items-baseline gap-4">
              <p className="text-4xl font-black text-green-500">{stats.activos || 0} <span className="text-xs text-slate-400 uppercase">Activos</span></p>
              <p className="text-2xl font-black text-red-400">{stats.suspendidos || 0} <span className="text-xs text-slate-400 uppercase">Susp.</span></p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center border-l-4 border-l-blue-500">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ingreso Proyectado (MRR)</h3>
            <p className="text-4xl font-black text-blue-600">${stats.ingresosProyectados || 0}</p>
            <span className="text-[10px] font-bold text-slate-400 mt-1">Si todos los activos pagan</span>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center border-l-4 border-l-green-500">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cobrado este mes</h3>
            <p className="text-4xl font-black text-green-600">${stats.ingresosReales || 0}</p>
            <span className="text-[10px] font-bold text-slate-400 mt-1">Dinero real en caja</span>
          </div>
        </div>

        {/* SECCIÓN DE GRÁFICA */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-12">
          <h2 className="text-lg font-black text-slate-800 mb-6">Comparativa: Proyectado vs. Recaudado</h2>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} tickFormatter={(value) => `$${value}`} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }}/>
                <Bar dataKey="Proyectado" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={80} />
                <Bar dataKey="Recaudado" fill="#22c55e" radius={[8, 8, 0, 0]} barSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* HISTORIAL DE PAGOS */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Flujo de Caja Reciente</h2>
            
            {/* Filtros de Tiempo */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              {['HOY', 'SEMANA', 'MES', 'TODOS'].map(tipo => (
                <button 
                  key={tipo} 
                  onClick={() => setFiltroTiempo(tipo)} 
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filtroTiempo === tipo ? 'bg-purple-500 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Mes Saldado</th>
                  <th className="p-4">Método</th>
                  <th className="p-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagos.length > 0 ? (
                  pagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-500">
                        {new Date(pago.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 text-sm font-black text-slate-800">{pago.cliente?.nombre || 'Cliente Eliminado'}</td>
                      <td className="p-4 text-xs font-bold text-blue-500 uppercase">{pago.mesCorrespondiente}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${pago.metodoPago === 'Efectivo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {pago.metodoPago}
                        </span>
                      </td>
                      <td className="p-4 text-right text-base font-black text-green-600">+${pago.monto}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-sm font-bold text-slate-400">No se encontraron pagos en este periodo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Logistica;