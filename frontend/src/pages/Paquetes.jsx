// src/pages/Paquetes.jsx
import React, { useState, useEffect } from 'react';
import api from '../api/axios'; // Ajusta la ruta si tu archivo se llama ../config/axios
import { useNavigate, Link } from 'react-router-dom';
import logoCitynet from '../assets/logo-citynet-antiguo.png';

const Paquetes = () => {
  const navigate = useNavigate();

  // Estados para el formulario
  const [nombre, setNombre] = useState('');
  const [velocidad, setVelocidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  
  // Estados para control de edición
  const [editMode, setEditMode] = useState(false);
  const [paqueteId, setPaqueteId] = useState(null);

  const [paquetes, setPaquetes] = useState([]);
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
      obtenerPaquetes();
    };
    verificarAcceso();
  }, [navigate]);

  const obtenerPaquetes = async () => {
    try {
      const token = localStorage.getItem('token');
      // Asegúrate de que esta ruta coincida con la que definiste en tu backend (ej. /paquetes o /admin/paquetes)
      const response = await api.get('/paquetes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaquetes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error al cargar los paquetes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para activar la edición
  const prepararEdicion = (paquete) => {
    setEditMode(true);
    setPaqueteId(paquete.id);
    setNombre(paquete.nombre);
    setVelocidad(paquete.velocidad || '');
    setPrecio(paquete.precio || '');
    setDescripcion(paquete.descripcion || '');
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube al formulario
  };

  const cancelarEdicion = () => {
    setEditMode(false);
    setPaqueteId(null);
    setNombre('');
    setVelocidad('');
    setPrecio('');
    setDescripcion('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ msg: editMode ? 'Actualizando...' : 'Guardando...', type: 'info' });

    try {
      const token = localStorage.getItem('token');
      const data = { 
        nombre, 
        velocidad: parseInt(velocidad), 
        precio: parseFloat(precio),
        descripcion 
      };

      if (editMode) {
        // RUTA PARA ACTUALIZAR
        await api.put(`/paquetes/${paqueteId}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus({ msg: 'Paquete actualizado correctamente', type: 'success' });
      } else {
        // RUTA PARA CREAR
        await api.post('/paquetes', data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus({ msg: '¡Paquete registrado con éxito!', type: 'success' });
      }

      cancelarEdicion();
      obtenerPaquetes();
      setTimeout(() => setStatus({ msg: '', type: '' }), 3000);
    } catch (error) {
      console.error("Error en la operación:", error);
      setStatus({ msg: 'Error al procesar la solicitud', type: 'error' });
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">Cargando Planes...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center px-8">
        <div className="flex items-center gap-4">
          <img src={logoCitynet} alt="Logo" className="h-10 brightness-0 invert" />
          <span className="text-[10px] font-black tracking-[0.3em] text-blue-400 border-l border-slate-700 pl-4 uppercase tracking-widest">Gestión de Paquetes</span>
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
              {editMode ? 'Editar Paquete' : 'Nuevo Paquete'}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-6 tracking-widest">
              {editMode ? `Editando ID: ${paqueteId}` : 'Configura un nuevo plan de internet'}
            </p>
            
            {status.msg && (
              <div className={`mb-4 p-3 rounded-2xl text-xs font-bold text-center ${status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {status.msg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Nombre del Plan</label>
                <input 
                  required type="text" 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" 
                  placeholder="Ej: Plan Hogar 100 Mbps" 
                  value={nombre} 
                  onChange={e => setNombre(e.target.value)} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Velocidad (Mbps)</label>
                  <input 
                    required type="number" 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" 
                    placeholder="Ej: 100" value={velocidad} 
                    onChange={e => setVelocidad(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Precio ($)</label>
                  <input 
                    required type="number" step="0.01"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" 
                    placeholder="Ej: 450.00" value={precio} 
                    onChange={e => setPrecio(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Descripción (Opcional)</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold resize-none h-24" 
                  placeholder="Ej: Ideal para streaming 4K y home office..." 
                  value={descripcion} 
                  onChange={e => setDescripcion(e.target.value)} 
                />
              </div>
              
              <button type="submit" className={`w-full ${editMode ? 'bg-blue-600' : 'bg-slate-900'} text-white py-5 rounded-3xl font-black text-sm tracking-widest hover:opacity-90 transition-all shadow-lg uppercase mt-4`}>
                {editMode ? 'Actualizar Paquete' : 'Registrar Paquete'}
              </button>

              {editMode && (
                <button type="button" onClick={cancelarEdicion} className="w-full text-slate-400 text-[10px] font-black uppercase hover:text-slate-600 mt-2">
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
                  <th className="p-6">Paquete</th>
                  <th className="p-6">Detalles</th>
                  <th className="p-6">Descripción</th>
                  <th className="p-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paquetes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest text-xs">
                      No hay paquetes registrados
                    </td>
                  </tr>
                ) : (
                  paquetes.map(paquete => (
                    <tr key={paquete.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-6">
                        <p className="font-black text-slate-800 text-base">{paquete.nombre}</p>
                        <span className="text-[10px] font-bold text-blue-500 uppercase">ID: {paquete.id.split('-')[0]}...</span>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{paquete.velocidad} Mbps</span>
                          <span className="text-xs font-black text-emerald-500">${parseFloat(paquete.precio).toFixed(2)} MXN</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <p className="text-xs text-slate-500 font-medium max-w-xs truncate">
                          {paquete.descripcion || 'Sin descripción'}
                        </p>
                      </td>
                      <td className="p-6 text-center">
                        <button 
                          onClick={() => prepararEdicion(paquete)}
                          className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                          title="Editar Paquete"
                        >
                          {/* Icono de lápiz */}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Paquetes;