// src/pages/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logoCitynet from '../assets/logo-citynet-antiguo.png';

const AdminPanel = () => {
  const navigate = useNavigate();
  
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ msg: '', type: '' });
  const [editandoId, setEditandoId] = useState(null);
  
  const [form, setForm] = useState({
    email: '',
    password: '',
    nombre: '',
    numCliente: '',
    plan: 'Fibra 20 Mbps',
    precio: 550,
    ip: ''
  });

  const PLANES_DISPONIBLES = {
    "Fibra 20 Mbps": 550,
    "Fibra 50 Mbps": 750,
    "Fibra 100 Mbps": 1100,
    "Personalizado": 0
  };

  useEffect(() => {
    const verificarAcceso = () => {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      if (!token || user?.rol !== 'ADMIN') {
        navigate('/login');
        return;
      }
      obtenerClientes();
    };
    verificarAcceso();
  }, [navigate]);

  const obtenerClientes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3001/api/admin/clientes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Aseguramos que recibimos un array
      setClientes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al obtener clientes:", err);
      setStatus({ msg: 'Error al conectar con el servidor', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- GESTIÓN DE FACTURAS ---
  const marcarComoPagada = async (id) => {
    if (!window.confirm("¿Marcar esta factura como pagada?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:3001/api/admin/factura/${id}/pagar`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      obtenerClientes();
    } catch (err) { alert("Error al actualizar factura"); }
  };

  const eliminarFactura = async (id) => {
    if (!window.confirm("¿Eliminar factura permanentemente?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3001/api/admin/factura/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      obtenerClientes();
    } catch (err) { alert("Error al eliminar factura"); }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      if (editandoId) {
        await axios.put(`http://localhost:3001/api/admin/cliente/${editandoId}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('http://localhost:3001/api/admin/registrar-cliente', form, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      cancelarEdicion();
      obtenerClientes();
    } catch (err) { setStatus({ msg: 'Error en la operación', type: 'error' }); }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm({ email: '', password: '', nombre: '', numCliente: '', plan: 'Fibra 20 Mbps', precio: 550, ip: '' });
  };

  // --- FUNCIÓN REFACCIONADA PARA OBTENER DATOS FRESCOS ---
  const prepararEdicion = async (clienteParaEditar) => {
    // 1. Ponemos el ID en el estado y scrolleamos arriba
    setEditandoId(clienteParaEditar.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      // 2. Traemos la información fresca y profunda desde el backend
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3001/api/admin/cliente/${clienteParaEditar.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const clienteFresco = res.data;
      const servicioActual = clienteFresco.servicios && clienteFresco.servicios.length > 0 
        ? clienteFresco.servicios[0] 
        : {};

      // 3. Poblamos el formulario
      setForm({
        nombre: clienteFresco.nombre || '',
        numCliente: clienteFresco.numCliente || '',
        email: clienteFresco.usuario?.email || '', 
        plan: servicioActual.plan || 'Fibra 20 Mbps',
        precio: servicioActual.precio || 550,
        ip: servicioActual.direccionIp || '', 
        password: '****' // No sobreescribir la contraseña
      });

    } catch (error) {
      console.error("Error al cargar detalles del cliente:", error);
      alert("Hubo un problema al cargar los datos recientes del cliente.");
      cancelarEdicion();
    }
  };

  // --- FUNCIÓN PARA GENERAR COBROS MANUALES ---
  const generarFactura = async (servicioId, precio) => {
    if(!window.confirm("¿Generar factura para este servicio?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:3001/api/admin/servicio/${servicioId}/generar-factura`, 
        { servicioId, monto: precio }, 
        {headers: { Authorization: `Bearer ${token}` }
      });
      obtenerClientes();
    } catch (err) { alert("Error al generar factura"); }
  }

  const toggleEstatus = async (servicioId, estadoActual) => {
    const nuevoEstado = estadoActual === 'ACTIVO' ? 'SUSPENDIDO' : 'ACTIVO';
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:3001/api/admin/servicio/${servicioId}/estatus`, 
        { nuevoEstado }, { headers: { Authorization: `Bearer ${token}` } }
      );
      obtenerClientes();
    } catch (err) { alert("Error al cambiar estatus"); }
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">Cargando Sistema...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* NAVBAR OSCURO */}
      <nav className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center px-8">
        <div className="flex items-center gap-4">
          <img src={logoCitynet} alt="Logo" className="h-10 brightness-0 invert" />
          <span className="text-[10px] font-black tracking-[0.3em] text-blue-400 border-l border-slate-700 pl-4 uppercase">Admin Panel</span>
        </div>
        <button onClick={() => {localStorage.clear(); navigate('/login');}} className="text-[10px] font-black px-4 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all">SALIR</button>
      </nav>

      <div className="max-w-7xl mx-auto mt-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 sticky top-8">
            <h2 className="text-xl font-black text-slate-800 mb-6">{editandoId ? 'Editar Cliente' : 'Nuevo Registro'}</h2>
            <form onSubmit={handleGuardar} className="space-y-4">
              <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="Nombre del Cliente" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black" value={form.plan} onChange={e => setForm({...form, plan: e.target.value, precio: PLANES_DISPONIBLES[e.target.value] || form.precio})}>
                  {Object.keys(PLANES_DISPONIBLES).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="Precio $" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input required disabled={editandoId} type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold disabled:opacity-40" placeholder="No. Cliente" value={form.numCliente} onChange={e => setForm({...form, numCliente: e.target.value})} />
                <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono font-bold text-blue-600" placeholder="IP Antena" value={form.ip} onChange={e => setForm({...form, ip: e.target.value})} />
              </div>

              <input required disabled={editandoId} type="email" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold disabled:opacity-40" placeholder="Correo Electrónico" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              
              {!editandoId && <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="Contraseña Temporal" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />}
              
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-sm tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 uppercase">
                {editandoId ? 'Guardar Cambios' : 'Registrar Cliente'}
              </button>
              {editandoId && <button onClick={cancelarEdicion} className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Cancelar</button>}
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: TABLA */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="p-6">Información</th>
                  <th className="p-6">Facturas Pendientes</th>
                  <th className="p-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clientes.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-6">
                      <p className="font-black text-slate-800 text-base">{c.nombre}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] font-bold text-blue-500 uppercase">{c.numCliente}</span>
                        <span className="text-[10px] font-bold text-slate-300">|</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{c.servicios?.[0]?.plan}</span>
                      </div>
                    </td>
                    
                    <td className="p-6">
                      {/* Envolvimos todo en un flex-col para que el botón quede debajo de las facturas */}
                      <div className="flex flex-col items-start gap-2">
                        <div className="flex flex-wrap gap-2">
                          {c.servicios?.[0]?.facturas?.filter(f => !f.pagada).map(f => (
                            <div key={f.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-3 pr-1 py-1 rounded-xl">
                              <span className="text-[10px] font-black text-slate-700">${f.monto}</span>
                              <div className="flex gap-1">
                                <button onClick={() => marcarComoPagada(f.id)} className="bg-green-500 text-white p-1 rounded-lg text-[8px] font-black uppercase px-2">Pagado</button>
                                <button onClick={() => eliminarFactura(f.id)} className="bg-white text-red-500 border border-red-100 p-1 rounded-lg text-[8px] font-black uppercase px-2">X</button>
                              </div>
                            </div>
                          ))}
                          {(!c.servicios?.[0]?.facturas || c.servicios[0].facturas.filter(f => !f.pagada).length === 0) && (
                            <span className="text-[10px] font-black text-green-400 bg-green-50 px-3 py-1 rounded-full uppercase">Al día ✅</span>
                          )}
                        </div>
                        
                        {/* AQUÍ ESTÁ EL BOTÓN DE GENERAR FACTURA VINCULADO AL SERVICIO */}
                        {c.servicios?.[0] && (
                          <button 
                            onClick={() => generarFactura(c.servicios?.[0]?.id, c.servicios?.[0]?.precio)} 
                            className="mt-1 text-[10px] font-black text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 uppercase"
                          >
                            <span>+ Generar Cobro</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => prepararEdicion(c)} className="bg-slate-100 p-3 rounded-2xl hover:bg-blue-50 transition-colors group">
                           <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-500 uppercase">Editar</span>
                        </button>
                        <button 
                          onClick={() => toggleEstatus(c.servicios?.[0]?.id, c.servicios?.[0]?.estado)}
                          className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase transition-all ${
                            c.servicios?.[0]?.estado === 'ACTIVO' 
                            ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-red-50 hover:text-red-600' 
                            : 'bg-red-50 text-red-600 border border-red-100 hover:bg-green-50 hover:text-green-600'
                          }`}>
                          {c.servicios?.[0]?.estado}
                        </button>
                      </div>
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

export default AdminPanel;