// src/pages/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logoCitynet from '../assets/logo-citynet-antiguo.png';

const AdminPanel = () => {
  const navigate = useNavigate();
  
  // Estados de la aplicación
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ msg: '', type: '' });
  
  // Estado del formulario de registro
  const [form, setForm] = useState({
    email: '',
    password: '',
    nombre: '',
    numCliente: '',
    plan: 'Fibra 20 Mbps',
    precio: 550,
    ip: ''
  });

  // 1. Seguridad y Carga Inicial
  useEffect(() => {
    const verificarAcceso = () => {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');

      // Si no hay token o el rol no es ADMIN, redirigir al login
      if (!token || user?.rol !== 'ADMIN') {
        navigate('/login');
        return;
      }
      obtenerClientes();
    };

    verificarAcceso();
  }, [navigate]);

  // 2. Obtener lista de clientes del Backend
  const obtenerClientes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3001/api/admin/clientes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientes(res.data);
    } catch (err) {
      console.error("Error al obtener clientes:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Registrar Nuevo Cliente
  const handleRegistro = async (e) => {
    e.preventDefault();
    setStatus({ msg: 'Procesando...', type: 'info' });

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3001/api/admin/registrar-cliente', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStatus({ msg: '✅ Cliente registrado con éxito', type: 'success' });
      // Limpiar formulario
      setForm({ email: '', password: '', nombre: '', numCliente: '', plan: 'Fibra 20 Mbps', precio: 550, ip: '' });
      obtenerClientes(); // Recargar tabla
    } catch (err) {
      setStatus({ 
        msg: '❌ Error: ' + (err.response?.data?.error || 'No se pudo registrar'), 
        type: 'error' 
      });
    }
  };

  // 4. Cambiar Estatus (Activar/Suspender)
  const toggleEstatus = async (servicioId, estadoActual) => {
    const nuevoEstado = estadoActual === 'ACTIVO' ? 'SUSPENDIDO' : 'ACTIVO';
    if (!window.confirm(`¿Cambiar estatus a ${nuevoEstado}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:3001/api/admin/servicio/${servicioId}/estatus`, 
        { nuevoEstado }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      obtenerClientes();
    } catch (err) {
      alert("Error al actualizar el servicio");
    }
  };

  // 5. Generación Masiva de Facturas
  const generarFacturacionMensual = async () => {
    if (!window.confirm("⚠️ Se generarán facturas de pago para TODOS los clientes activos. ¿Continuar?")) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:3001/api/admin/generar-facturas-mes', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.mensaje);
      obtenerClientes();
    } catch (err) {
      alert("Error al procesar la facturación masiva");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-500">Cargando consola de administración...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* NAVBAR ADMIN */}
      <nav className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center px-8">
        <div className="flex items-center gap-4">
          <img src={logoCitynet} alt="Logo" className="h-10 brightness-0 invert" />
          <div className="h-6 w-[1px] bg-slate-700 mx-2"></div>
          <span className="text-xs font-black tracking-widest text-blue-400">ADMIN PANEL</span>
        </div>
        <button 
          onClick={handleLogout}
          className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-red-500/20"
        >
          SALIR DEL SISTEMA
        </button>
      </nav>

      <div className="max-w-6xl mx-auto mt-8 px-4 space-y-8">
        
        {/* BARRA DE ACCIONES RÁPIDAS */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Panel de Control</h1>
            <p className="text-slate-400 text-sm font-medium">Gestión de infraestructura y cobros</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={generarFacturacionMensual}
              className="bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-blue-200 transition-transform active:scale-95"
            >
              <span>⚡</span> GENERAR COBROS DEL MES
            </button>
            <button 
              onClick={() => window.print()}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-sm transition-all"
            >
              <span>🖨️</span> REPORTE
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMNA IZQUIERDA: FORMULARIO */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 sticky top-8">
              <h2 className="text-lg font-black text-slate-800 mb-6">Nuevo Registro</h2>
              
              {status.msg && (
                <div className={`p-4 rounded-xl mb-6 text-xs font-bold ${
                  status.type === 'success' ? 'bg-green-50 text-green-600' : 
                  status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {status.msg}
                </div>
              )}

              <form onSubmit={handleRegistro} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre del Cliente</label>
                  <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-primary text-sm"
                    value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej. Juan Pérez" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">No. Cliente</label>
                    <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                      value={form.numCliente} onChange={e => setForm({...form, numCliente: e.target.value})} placeholder="CT-1001" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">IP Antena</label>
                    <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono"
                      value={form.ip} onChange={e => setForm({...form, ip: e.target.value})} placeholder="10.20.x.x" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email de Acceso</label>
                  <input required type="email" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                    value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Contraseña Temporal</label>
                  <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                    value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black text-sm mt-4 hover:bg-slate-700 transition-all">
                  GUARDAR CLIENTE
                </button>
              </form>
            </div>
          </div>

          {/* COLUMNA DERECHA: TABLA */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h2 className="font-black text-slate-800">Clientes Activos</h2>
                <span className="text-xs font-bold text-slate-400 bg-white border px-3 py-1 rounded-lg">
                  Total: {clientes.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                      <th className="p-6">Información</th>
                      <th className="p-6">Servicio</th>
                      <th className="p-6">Estatus</th>
                      <th className="p-6 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {clientes.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-6">
                          <p className="font-bold text-slate-800">{c.nombre}</p>
                          <p className="text-xs text-slate-400 font-medium">{c.numCliente}</p>
                        </td>
                        <td className="p-6">
                          <p className="text-sm font-bold text-slate-600">{c.servicios[0]?.plan}</p>
                          <p className="text-[10px] font-mono text-blue-500 bg-blue-50 inline-block px-2 rounded mt-1">
                            {c.servicios[0]?.direccionIp}
                          </p>
                        </td>
                        <td className="p-6">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                            c.servicios[0]?.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {c.servicios[0]?.estado}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <button 
                            onClick={() => toggleEstatus(c.servicios[0]?.id, c.servicios[0]?.estado)}
                            className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all ${
                              c.servicios[0]?.estado === 'ACTIVO' 
                              ? 'text-red-500 bg-red-50 hover:bg-red-500 hover:text-white' 
                              : 'text-green-500 bg-green-50 hover:bg-green-500 hover:text-white'
                            }`}
                          >
                            {c.servicios[0]?.estado === 'ACTIVO' ? 'SUSPENDER' : 'RE-ACTIVAR'}
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
      </div>
    </div>
  );
};

export default AdminPanel;