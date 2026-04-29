// src/pages/TorresPanel.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import logoCitynet from '../assets/logo-citynet-antiguo.png';

const TorresPanel = () => {
  const navigate = useNavigate();

  // Estados para el formulario
  const [nombre, setNombre] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  
  // Estados para control de edición
  const [editMode, setEditMode] = useState(false);
  const [torreId, setTorreId] = useState(null);

  const [torres, setTorres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ msg: '', type: '' });

  useEffect(() => {
    const verificarAcceso = () => {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      if (!token || user?.rol !== 'ADMIN') {
        navigate('/login');
        return;
      }
      obtenerTorres();
    };
    verificarAcceso();
  }, [navigate]);

  const obtenerTorres = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/admin/torres', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTorres(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error al cargar las torres:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para activar la edición
  const prepararEdicion = (torre) => {
    setEditMode(true);
    setTorreId(torre.id);
    setNombre(torre.nombre);
    setLatitud(torre.latitud || '');
    setLongitud(torre.longitud || '');
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube al formulario
  };

  const cancelarEdicion = () => {
    setEditMode(false);
    setTorreId(null);
    setNombre('');
    setLatitud('');
    setLongitud('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ msg: editMode ? 'Actualizando...' : 'Guardando...', type: 'info' });

    try {
      const token = localStorage.getItem('token');
      const data = { 
        nombre, 
        latitud: latitud ? parseFloat(latitud) : null, 
        longitud: longitud ? parseFloat(longitud) : null 
      };

      if (editMode) {
        // RUTA PARA ACTUALIZAR
        await axios.put(`http://localhost:3001/api/admin/torres/${torreId}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus({ msg: 'Torre actualizada correctamente', type: 'success' });
      } else {
        // RUTA PARA CREAR
        await axios.post('http://localhost:3001/api/admin/torres', data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus({ msg: '¡Torre registrada con éxito!', type: 'success' });
      }

      cancelarEdicion();
      obtenerTorres();
      setTimeout(() => setStatus({ msg: '', type: '' }), 3000);
    } catch (error) {
      console.error("Error en la operación:", error);
      setStatus({ msg: 'Error al procesar la solicitud', type: 'error' });
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">Cargando Infraestructura...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center px-8">
        <div className="flex items-center gap-4">
          <img src={logoCitynet} alt="Logo" className="h-10 brightness-0 invert" />
          <span className="text-[10px] font-black tracking-[0.3em] text-blue-400 border-l border-slate-700 pl-4 uppercase tracking-widest">Gestión de Torres</span>
        </div>
        <div className="flex gap-4">
          <Link to="/admin" className="text-[10px] font-black px-4 py-2 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white transition-all uppercase">
            Volver a Clientes
          </Link>
          <button onClick={() => {localStorage.clear(); navigate('/login');}} className="text-[10px] font-black px-4 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all">SALIR</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto mt-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* FORMULARIO ADAPTATIVO */}
        <div className="lg:col-span-4">
          <div className={`bg-white p-8 rounded-[2.5rem] shadow-sm border ${editMode ? 'border-blue-200 ring-2 ring-blue-50' : 'border-slate-100'} sticky top-8 transition-all`}>
            <h2 className="text-xl font-black text-slate-800 mb-2">
              {editMode ? 'Editar Torre' : 'Nueva Torre'}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-6 tracking-widest">
              {editMode ? `Editando ID: ${torreId}` : 'Configura un nuevo punto de red'}
            </p>
            
            {status.msg && (
              <div className={`mb-4 p-3 rounded-2xl text-xs font-bold text-center ${status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {status.msg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Nombre</label>
                <input 
                  required type="text" 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" 
                  placeholder="Ej: Cerro Norte" 
                  value={nombre} 
                  onChange={e => setNombre(e.target.value)} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Latitud</label>
                  <input 
                    type="number" step="any"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" 
                    placeholder="19.2..." value={latitud} 
                    onChange={e => setLatitud(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Longitud</label>
                  <input 
                    type="number" step="any"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" 
                    placeholder="-103..." value={longitud} 
                    onChange={e => setLongitud(e.target.value)} 
                  />
                </div>
              </div>
              
              <button type="submit" className={`w-full ${editMode ? 'bg-blue-600' : 'bg-slate-900'} text-white py-5 rounded-3xl font-black text-sm tracking-widest hover:opacity-90 transition-all shadow-lg uppercase mt-4`}>
                {editMode ? 'Actualizar Cambios' : 'Registrar Torre'}
              </button>

              {editMode && (
                <button type="button" onClick={cancelarEdicion} className="w-full text-slate-400 text-[10px] font-black uppercase hover:text-slate-600">
                  Cancelar Edición
                </button>
              )}
            </form>
          </div>
        </div>

        {/* TABLA CON BOTÓN DE EDITAR */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="p-6">Torre</th>
                  <th className="p-6">Coordenadas</th>
                  <th className="p-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {torres.map(torre => (
                  <tr key={torre.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-6">
                      <p className="font-black text-slate-800 text-base">{torre.nombre}</p>
                      <span className="text-[10px] font-bold text-blue-500 uppercase">ID: {torre.id}</span>
                    </td>
                    <td className="p-6">
                      {torre.latitud ? (
                         <span className="text-xs font-mono font-bold text-slate-500">
                           {torre.latitud}, {torre.longitud}
                         </span>
                      ) : (
                        <span className="text-[10px] font-black text-orange-400 bg-orange-50 px-3 py-1 rounded-full uppercase">Sin GPS</span>
                      )}
                    </td>
                    <td className="p-6 text-center">
                      <button 
                        onClick={() => prepararEdicion(torre)}
                        className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                        title="Editar Coordenadas"
                      >
                        {/* Icono de lápiz simple */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TorresPanel;