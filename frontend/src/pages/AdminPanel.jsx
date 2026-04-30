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
  const [torresDisponibles, setTorresDisponibles] = useState([]);
  
  // FORMULARIO ORIGINAL
  const [form, setForm] = useState({
    email: '',
    password: '',
    nombre: '',
    numCliente: 'CT-',
    plan: 'Fibra 20 Mbps',
    precio: 550,
    ip: '',
    diaCobro: 1,
    direccion: '',
    latitud: '',
    longitud: '',
    torreId: ''
  });

  // --- NUEVOS ESTADOS PARA EL MODAL DE PAGO ---
  const [showModalPago, setShowModalPago] = useState(false);
  const [clienteActivo, setClienteActivo] = useState(null);
  const [pagoData, setPagoData] = useState({
    monto: '', mesCorrespondiente: 'Abril 2026', metodoPago: 'Efectivo', notas: ''
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
      obtenerTorresParaSelect();
    };
    verificarAcceso();
  }, [navigate]);

  const obtenerClientes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3001/api/admin/clientes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al obtener clientes:", err);
      setStatus({ msg: 'Error al conectar con el servidor', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const obtenerTorresParaSelect = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/admin/torres', {
        headers: { Authorization: `Bearer ${token}` } 
      });
      setTorresDisponibles(response.data);
    } catch (error) {
      console.error("Error al cargar torres para el formulario:", error);
    }
  };

  // --- NUEVAS FUNCIONES DE PAGO DIRECTO ---
  const abrirModalPago = (cliente) => {
    setClienteActivo(cliente);
    // Intentamos sacar el precio de su servicio, o lo dejamos en blanco
    const precioSugerido = cliente.servicios?.[0]?.precio || '';
    setPagoData({
      monto: precioSugerido, 
      mesCorrespondiente: 'Abril 2026',
      metodoPago: 'Efectivo',
      notas: ''
    });
    setShowModalPago(true);
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3001/api/admin/pagos', 
        { clienteId: clienteActivo.id, ...pagoData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Pago de $${pagoData.monto} registrado con éxito para ${clienteActivo.nombre}`);
      setShowModalPago(false);
      setClienteActivo(null);
    } catch (error) {
      console.error("Error al registrar pago", error);
      alert("Hubo un error al registrar el pago.");
    }
  };

  // --- GESTIÓN DE FACTURAS Y COBROS (ORIGINAL) ---
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
  };

  const generarFacturasLote = async (dia) => {
    if (!window.confirm(`¿Generar facturas masivas para todos los clientes del grupo ${dia}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:3001/api/admin/facturas/generar-lote`,
        { diaCobro: dia },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(res.data.mensaje);
      obtenerClientes();
    } catch (err) { alert("Error al generar facturas masivas"); }
  };

  // --- GESTIÓN DE CLIENTES (ORIGINAL) ---
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
    setForm({ 
      email: '', password: '', nombre: '', numCliente: 'CT-', plan: 'Fibra 20 Mbps', 
      precio: 550, ip: '', diaCobro: 1, direccion: '', latitud: '', longitud: '', torreId: '' 
    });
  };

  const prepararEdicion = async (clienteParaEditar) => {
    setEditandoId(clienteParaEditar.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3001/api/admin/cliente/${clienteParaEditar.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const clienteFresco = res.data;
      const servicioActual = clienteFresco.servicios && clienteFresco.servicios.length > 0 ? clienteFresco.servicios[0] : {};

      setForm({
        nombre: clienteFresco.nombre || '',
        numCliente: clienteFresco.numCliente || 'CT-',
        email: clienteFresco.usuario?.email || '', 
        plan: servicioActual.plan || 'Fibra 20 Mbps',
        precio: servicioActual.precio || 550,
        ip: servicioActual.direccionIp || '', 
        diaCobro: clienteFresco.diaCobro || 1, 
        password: '****',
        direccion: clienteFresco.direccion || '',
        latitud: clienteFresco.latitud || '',
        longitud: clienteFresco.longitud || '',
        torreId: clienteFresco.torreId || ''
      });

    } catch (error) {
      console.error("Error al cargar detalles del cliente:", error);
      alert("Hubo un problema al cargar los datos recientes del cliente.");
      cancelarEdicion();
    }
  };

  const eliminarCliente = async (id) => {
    if (!window.confirm("¡PELIGRO! ¿Estás seguro de que deseas eliminar este cliente y TODO su historial de facturas? Esta acción no se puede deshacer.")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3001/api/admin/clientes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      obtenerClientes();
    } catch (err) { alert("Error al eliminar cliente"); }
  };

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
    <div className="min-h-screen bg-slate-50 pb-20 font-sans relative">
      
      {/* NAVBAR OSCURO */}
      <nav className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center px-8">
        <div className="flex items-center gap-4">
          <img src={logoCitynet} alt="Logo" className="h-10 brightness-0 invert" />
          <span className="text-[10px] font-black tracking-[0.3em] text-blue-400 border-l border-slate-700 pl-4 uppercase">Admin Panel</span>
        </div>
        
        <div className="flex gap-4">
          <button onClick={() => navigate('/admin/mapa')} className="text-[10px] font-black px-4 py-2 rounded-xl border border-green-500/30 text-green-500 hover:bg-green-500 hover:text-white transition-all uppercase">Ver Mapa</button>
          <button onClick={() => navigate('/admin/torres')} className="text-[10px] font-black px-4 py-2 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white transition-all uppercase">Gestionar Torres</button>
          <button onClick={() => navigate('/admin/logistica')} className="text-[10px] font-black px-4 py-2 rounded-xl border border-purple-500/30 text-purple-500 hover:bg-purple-500 hover:text-white transition-all uppercase">Gestionar Logística</button>
          <button onClick={() => {localStorage.clear(); navigate('/login');}} className="text-[10px] font-black px-4 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all">SALIR</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto mt-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 sticky top-8">
            <h2 className="text-xl font-black text-slate-800 mb-6">{editandoId ? 'Editar Cliente' : 'Nuevo Registro'}</h2>
            <form onSubmit={handleGuardar} className="space-y-4">
              <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="Nombre del Cliente" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
              
              <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold placeholder:text-slate-400" placeholder="Dirección (Ej: Calle 5 de Mayo #123)" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} />

              <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black text-slate-700" value={form.torreId} onChange={e => setForm({...form, torreId: e.target.value})}>
                <option value="">-- Selecciona una Torre (Opcional) --</option>
                {torresDisponibles.map((torre) => (
                  <option key={torre.id} value={torre.id}>{torre.nombre}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="any" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold placeholder:text-slate-400" placeholder="Latitud" value={form.latitud} onChange={e => setForm({...form, latitud: e.target.value})} />
                <input type="number" step="any" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold placeholder:text-slate-400" placeholder="Longitud" value={form.longitud} onChange={e => setForm({...form, longitud: e.target.value})} />
              </div>

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

              <div className="grid grid-cols-1 gap-4">
                 <select className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl text-[11px] font-black text-blue-800" value={form.diaCobro} onChange={e => setForm({...form, diaCobro: parseInt(e.target.value)})}>
                  <option value={1}>Grupo 1 (Cobro día 1 del mes)</option>
                  <option value={15}>Grupo 15 (Cobro día 15 del mes)</option>
                </select>
              </div>

              <input required disabled={editandoId} type="email" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold disabled:opacity-40" placeholder="Correo Electrónico" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              
              {!editandoId && <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="Contraseña Temporal" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />}
              
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-sm tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 uppercase">
                {editandoId ? 'Guardar Cambios' : 'Registrar Cliente'}
              </button>
              {editandoId && <button type="button" onClick={cancelarEdicion} className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Cancelar</button>}
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: TABLA Y BOTONES MASIVOS */}
        <div className="lg:col-span-8">
          
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 mb-6 px-6">
            <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase mb-4 md:mb-0">Facturación Masiva</h3>
            <div className="flex gap-2">
                <button onClick={() => generarFacturasLote(1)} className="bg-slate-900 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-md">Facturar Grupo 1</button>
                <button onClick={() => generarFacturasLote(15)} className="bg-slate-900 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-md">Facturar Grupo 15</button>
            </div>
          </div>

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
                        <span className="text-[10px] font-bold text-slate-300">|</span>
                        <span className={`text-[10px] font-black uppercase ${c.diaCobro === 15 ? 'text-purple-500' : 'text-orange-500'}`}>Gpo: {c.diaCobro || 1}</span>
                      </div>
                    </td>
                    
                    <td className="p-6">
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
                      <div className="flex justify-end gap-2 items-center flex-wrap">
                        
                        {/* BOTÓN DE COBRAR */}
                        <button onClick={() => abrirModalPago(c)} className="bg-green-50 p-3 rounded-2xl hover:bg-green-500 transition-colors group border border-green-100">
                           <span className="text-[10px] font-black text-green-600 group-hover:text-white uppercase">💳 Cobrar</span>
                        </button>

                        {/* NUEVO BOTÓN DE EXPEDIENTE AÑADIDO AQUÍ */}
                        <button onClick={() => navigate(`/admin/cliente/${c.id}`)} className="bg-blue-50 p-3 rounded-2xl hover:bg-blue-500 transition-colors group border border-blue-100">
                           <span className="text-[10px] font-black text-blue-500 group-hover:text-white uppercase">👁️ Expediente</span>
                        </button>

                        {/* BOTÓN DE EDITAR */}
                        <button onClick={() => prepararEdicion(c)} className="bg-slate-100 p-3 rounded-2xl hover:bg-blue-50 transition-colors group">
                           <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-500 uppercase">Editar</span>
                        </button>
                        
                        {/* BOTÓN DE ESTATUS */}
                        <button 
                          onClick={() => toggleEstatus(c.servicios?.[0]?.id, c.servicios?.[0]?.estado)}
                          className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase transition-all ${
                            c.servicios?.[0]?.estado === 'ACTIVO' 
                            ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-red-50 hover:text-red-600' 
                            : 'bg-red-50 text-red-600 border border-red-100 hover:bg-green-50 hover:text-green-600'
                          }`}>
                          {c.servicios?.[0]?.estado}
                        </button>

                        {/* BOTÓN DE BORRAR */}
                        <button onClick={() => eliminarCliente(c.id)} className="bg-red-50 p-3 rounded-2xl hover:bg-red-500 transition-colors group border border-red-100">
                           <span className="text-[10px] font-black text-red-400 group-hover:text-white uppercase">Borrar</span>
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

      {/* --- NUEVO MODAL DE PAGO (OVERLAY FLOTANTE) --- */}
      {showModalPago && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-1">Registrar Pago</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
              Cliente: <span className="text-blue-500">{clienteActivo?.nombre}</span>
            </p>

            <form onSubmit={handleRegistrarPago} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Monto a cobrar ($)</label>
                <input required type="number" step="any" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xl font-black text-slate-800" value={pagoData.monto} onChange={e => setPagoData({...pagoData, monto: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Mes a saldar</label>
                  <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" value={pagoData.mesCorrespondiente} onChange={e => setPagoData({...pagoData, mesCorrespondiente: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Método</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-600" value={pagoData.metodoPago} onChange={e => setPagoData({...pagoData, metodoPago: e.target.value})}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Notas (Opcional)</label>
                <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="Ej. Dejó $50 a cuenta" value={pagoData.notas} onChange={e => setPagoData({...pagoData, notas: e.target.value})} />
              </div>

              <div className="flex gap-4 mt-6">
                <button type="button" onClick={() => setShowModalPago(false)} className="flex-1 p-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 p-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200 transition-all">Confirmar Pago</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;