// src/pages/Logistica.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import logoCitynet from '../assets/logo-citynet-antiguo.png';

const Logistica = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const res = await axios.get('http://localhost:3001/api/admin/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [navigate]);

  if (loading || !stats) {
    return <div className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">Cargando Métricas...</div>;
  }

  // Datos para la gráfica
  const chartData = [
    {
      name: 'Estado Financiero (Mes Actual)',
      Proyectado: stats.ingresosProyectados,
      Recaudado: stats.ingresosReales,
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
            <p className="text-5xl font-black text-slate-800">{stats.totalClientes}</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado del Servicio</h3>
            <div className="flex items-baseline gap-4">
              <p className="text-4xl font-black text-green-500">{stats.activos} <span className="text-xs text-slate-400 uppercase">Activos</span></p>
              <p className="text-2xl font-black text-red-400">{stats.suspendidos} <span className="text-xs text-slate-400 uppercase">Susp.</span></p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center border-l-4 border-l-blue-500">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ingreso Proyectado (MRR)</h3>
            <p className="text-4xl font-black text-blue-600">${stats.ingresosProyectados}</p>
            <span className="text-[10px] font-bold text-slate-400 mt-1">Si todos los activos pagan</span>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center border-l-4 border-l-green-500">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cobrado este mes</h3>
            <p className="text-4xl font-black text-green-600">${stats.ingresosReales}</p>
            <span className="text-[10px] font-bold text-slate-400 mt-1">Dinero real en caja</span>
          </div>

        </div>

        {/* SECCIÓN DE GRÁFICA */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h2 className="text-lg font-black text-slate-800 mb-6">Comparativa: Proyectado vs. Recaudado</h2>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }}/>
                <Bar dataKey="Proyectado" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={80} />
                <Bar dataKey="Recaudado" fill="#22c55e" radius={[8, 8, 0, 0]} barSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Logistica;