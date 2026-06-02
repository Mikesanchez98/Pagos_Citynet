// src/pages/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import logoCitynet from '../assets/logo-citynet-antiguo.png';

const AdminPanel = () => {
  const navigate = useNavigate();
  
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ msg: '', type: '' });
  const [editandoId, setEditandoId] = useState(null);
  const [torresDisponibles, setTorresDisponibles] = useState([]);
  const [paquetesDisponibles, setPaquetesDisponibles] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // ESTADOS PARA BÚSQUEDA Y FILTROS
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('TODOS'); 

  // FORMULARIO ACTUALIZADO (Con teléfono)
  const [form, setForm] = useState({
    email: '',
    password: '',
    nombre: '',
    numCliente: 'CT-',
    plan: '',
    precio:0,
    ip: '',
    diaCobro: 1,
    direccion: '',
    latitud: '',
    longitud: '',
    torreId: '',
    telefono: '' 
  });

  // ESTADOS PARA EL MODAL DE PAGO
  const [showModalPago, setShowModalPago] = useState(false);
  const [clienteActivo, setClienteActivo] = useState(null);
  const [pagoData, setPagoData] = useState({
    monto: '', mesCorrespondiente: 'Abril 2026', metodoPago: 'Efectivo', notas: ''
  });

  // ESTADOS PARA EL MODAL DE FACTURA
  const [showModalFactura, setShowModalFactura] = useState(false);
  const [servicioActivoFactura, setServicioActivoFactura] = useState(null);

  const [facturaData, setFacturaData] = useState({
    monto: '',
    concepto: 'Mensualidad de Internet' 
  });

  const PLANES_DISPONIBLES = {
    "Fibra 20 Mbps": 550,
    "Fibra 50 Mbps": 750,
    "Fibra 100 Mbps": 1100,
    "Personalizado": 0
  };

  useEffect(() => {
    const verificarAcceso = () => {
      api.get('/paquetes').then(res => setPaquetesDisponibles(res.data)).catch(err => console.error("Error al cargar paquetes para el formulario:", err));
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
      const res = await api.get('/admin/clientes', {
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
      const response = await api.get('/admin/torres', {
        headers: { Authorization: `Bearer ${token}` } 
      });
      setTorresDisponibles(response.data);
    } catch (error) {
      console.error("Error al cargar torres para el formulario:", error);
    }
  };

  const abrirModalFactura = (servicioId, precioActual, nombreCliente) => {
    setServicioActivoFactura({ id: servicioId, cliente: nombreCliente });
    setFacturaData({
      monto: precioActual || '',
      concepto: 'Mensualidad de Internet'
    });
    setShowModalFactura(true);
  };

  const handleGenerarFacturaSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await api.post(`/admin/servicio/${servicioActivoFactura.id}/generar-factura`, 
        { 
          servicioId: servicioActivoFactura.id, 
          monto: facturaData.monto,
          concepto: facturaData.concepto 
        }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Factura generada con éxito para ${servicioActivoFactura.cliente}`);
      setShowModalFactura(false);
      obtenerClientes(); 
    } catch (err) { 
      console.error("Error al generar factura:", err);
      alert("Error al generar la factura"); 
    }
  };

  const abrirModalPago = (cliente) => {
    setClienteActivo(cliente);
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
      await api.post('/admin/pagos', 
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

  const marcarComoPagada = async (id) => {
    if (!window.confirm("¿Marcar esta factura como pagada?")) return;
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/admin/factura/${id}/pagar`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      obtenerClientes();
    } catch (err) { alert("Error al actualizar factura"); }
  };

  const eliminarFactura = async (id) => {
    if (!window.confirm("¿Eliminar factura permanentemente?")) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/admin/factura/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      obtenerClientes();
    } catch (err) { alert("Error al eliminar factura"); }
  };

  const generarFactura = async (servicioId, precio) => {
    if(!window.confirm("¿Generar factura para este servicio?")) return;
    try {
      const token = localStorage.getItem('token');
      await api.post(`/admin/servicio/${servicioId}/generar-factura`, 
        { servicioId, monto: precio }, 
        {headers: { Authorization: `Bearer ${token}` }
      });
      obtenerClientes();
    } catch (err) { alert("Error al generar factura"); }
  };

  // 🤖 NUEVA FUNCIÓN: EJECUTAR AUTOMATIZACIÓN DIARIA MANUALMENTE
  const ejecutarCronManual = async () => {
    if (!window.confirm("¿Deseas forzar la ejecución de la automatización (Facturas y Cortes) programada para el día de hoy?")) return;
    
    try {
      const token = localStorage.getItem('token');
      // Apuntamos a la nueva ruta unificada usando GET
      const res = await api.get('/admin/cron/procesar-dia', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Armamos un mensaje detallado con la respuesta del backend
      const mensajeExito = `¡Automatización completada con éxito!\n\n📋 Facturación: ${res.data.facturas}\n🚨 Cortes: ${res.data.suspensiones}`;
      alert(mensajeExito);
      
      obtenerClientes(); 
    } catch (err) { 
      console.error("Error al ejecutar el cron manual:", err);
      alert("Hubo un error al ejecutar la automatización diaria. Revisa la consola del servidor."); 
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      if (editandoId) {
        await api.put(`/admin/cliente/${editandoId}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await api.post('/admin/registrar-cliente', form, {
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
      precio: 550, ip: '', diaCobro: 1, direccion: '', latitud: '', longitud: '', torreId: '',
      telefono: '' 
    });
  };

  const prepararEdicion = async (clienteParaEditar) => {
    setEditandoId(clienteParaEditar.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/admin/cliente/${clienteParaEditar.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const clienteFresco = res.data;
      const servicioActual = clienteFresco.servicios && clienteFresco.servicios.length > 0 ? clienteFresco.servicios[0] : {};

      setForm({
        nombre: clienteFresco.nombre || '',
        direccion: clienteFresco.direccion || '',
        torreId: clienteFresco.torreId || '',
        latitud: clienteFresco.latitud || '',
        longitud: clienteFresco.longitud || '',
        paqueteId: clienteFresco.paqueteId || '',
        precio: servicioActual.precio || '', 
        numCliente: clienteFresco.numCliente || '',
        ip: servicioActual.direccionIp || '', 
        diaCobro: clienteFresco.diaCobro || 1,
        telefono: clienteFresco.telefono || '',
        email: clienteFresco.usuario ? clienteFresco.usuario.email : '', 
        password: clienteFresco.usuario ? clienteFresco.usuario.password : ''
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
      await api.delete(`/admin/clientes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      obtenerClientes();
    } catch (err) { alert("Error al eliminar cliente"); }
  };

  const toggleEstatus = async (servicioId, estadoActual) => {
    const nuevoEstado = estadoActual === 'ACTIVO' ? 'SUSPENDIDO' : 'ACTIVO';
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/admin/servicio/${servicioId}/estatus`, 
        { nuevoEstado }, { headers: { Authorization: `Bearer ${token}` } }
      );
      obtenerClientes();
    } catch (err) { alert("Error al cambiar estatus"); }
  };

  // 📥 NUEVA FUNCIÓN: IMPORTAR EL ARCHIVO CSV DE CLIENTES
  const handleImportarCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validación de extensión
    if (!file.name.endsWith('.csv')) {
      alert("Por favor, selecciona únicamente archivos con extensión .csv");
      e.target.value = null;
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas importar la lista de clientes desde "${file.name}"? Se procesarán todos los registros automáticamente.`)) {
      e.target.value = null;
      return;
    }

    const formData = new FormData();
    formData.append('file', file); // Asegúrate que en el backend multer busque el campo 'file'

    try {
      const token = localStorage.getItem('token');
      // Si usas otro estado de carga o notificación, puedes adaptarlo aquí:
      if (typeof setStatus === 'function') {
        setStatus({ msg: 'Procesando e importando clientes, por favor espera...', type: 'info' });
      }
      
      const res = await api.post('/admin/clientes/importar', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      alert(res.data.mensaje || "¡Importación masiva completada con éxito!");
      
      // Llamamos a tu función original para refrescar la tabla de clientes
      if (typeof obtenerClientes === 'function') obtenerClientes(); 
    } catch (err) {
      console.error("Error al importar lote de clientes:", err);
      alert(err.response?.data?.error || "Hubo un problema al procesar el archivo CSV. Asegúrate de que las columnas coincidan con la plantilla requerida.");
    } finally {
      e.target.value = null; // Limpiamos el input
      if (typeof setStatus === 'function') setStatus({ msg: '', type: '' });
    }
  };

  // LÓGICA DE FILTRADO Y BÚSQUEDA
  const clientesFiltrados = clientes?.filter(cliente => {
    const texto = busqueda.toLowerCase();
    const coincideTexto = 
      cliente.nombre?.toLowerCase().includes(texto) || 
      cliente.numCliente?.toLowerCase().includes(texto);

    if (!coincideTexto) return false;

    const servicioPrincipal = cliente.servicios?.[0];
    const facturas = servicioPrincipal?.facturas || [];
    const estadoServicio = servicioPrincipal?.estado || 'SIN SERVICIO';
    
    const esDeudor = facturas.some(f => !f.pagada); 

    if (filtro === 'DEUDORES') return esDeudor;
    if (filtro === 'ACTIVOS') return estadoServicio === 'ACTIVO';
    if (filtro === 'SUSPENDIDOS') return estadoServicio === 'SUSPENDIDO';
    
    return true; 
  }) || [];

  if (loading) return <div className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">Cargando Sistema...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans relative">
      
      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white shadow-xl sticky top-0 z-50">
        <div className="flex justify-between items-center p-4 px-8">
          <div className="flex items-center gap-4">
            <img src={logoCitynet} alt="Logo" className="h-10 brightness-0 invert" />
            <span className="text-[10px] font-black tracking-[0.3em] text-blue-400 border-l border-slate-700 pl-4 uppercase">
              Admin Panel
            </span>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-400 hover:text-white focus:outline-none transition-colors">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          <div className="hidden md:flex gap-4">
            <button onClick={() => navigate('/admin/cobranza')} className="text-[10px] font-black px-4 py-2 rounded-xl border border-orange-500/30 text-orange-500 hover:bg-orange-500 hover:text-white transition-all uppercase">Gestor de Cobranza</button>
            <button onClick={() => navigate('/admin/mapa')} className="text-[10px] font-black px-4 py-2 rounded-xl border border-green-500/30 text-green-500 hover:bg-green-500 hover:text-white transition-all uppercase">Ver Mapa</button>
            <button onClick={() => navigate('/admin/torres')} className="text-[10px] font-black px-4 py-2 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white transition-all uppercase">Gestionar Torres</button>
            <button onClick={() => navigate('/admin/paquetes')} className="text-[10px] font-black px-4 py-2 rounded-xl border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all uppercase">Gestionar Paquetes</button>
            <button onClick={() => navigate('/admin/logistica')} className="text-[10px] font-black px-4 py-2 rounded-xl border border-purple-500/30 text-purple-500 hover:bg-purple-500 hover:text-white transition-all uppercase">Gestionar Logística</button>
            <button onClick={() => {localStorage.clear(); navigate('/login');}} className="text-[10px] font-black px-4 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase">SALIR</button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-slate-800 border-t border-slate-700 px-4 pt-2 pb-4 space-y-3 shadow-inner animate-in slide-in-from-top-2 duration-200">
            <button onClick={() => { setIsMenuOpen(false); navigate('/admin/cobranza'); }} className="block w-full text-left text-[11px] font-black px-4 py-3 rounded-xl border border-orange-500/30 text-orange-500 hover:bg-orange-500 hover:text-white transition-all uppercase">Gestor de Cobranza</button>
            <button onClick={() => { setIsMenuOpen(false); navigate('/admin/mapa'); }} className="block w-full text-left text-[11px] font-black px-4 py-3 rounded-xl border border-green-500/30 text-green-500 hover:bg-green-500 hover:text-white transition-all uppercase">Ver Mapa</button>
            <button onClick={() => { setIsMenuOpen(false); navigate('/admin/torres'); }} className="block w-full text-left text-[11px] font-black px-4 py-3 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white transition-all uppercase">Gestionar Torres</button>
            <button onClick={() => { setIsMenuOpen(false); navigate('/admin/paquetes'); }} className="block w-full text-left text-[11px] font-black px-4 py-3 rounded-xl border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all uppercase">Gestionar Paquetes</button>
            <button onClick={() => { setIsMenuOpen(false); navigate('/admin/logistica'); }} className="block w-full text-left text-[11px] font-black px-4 py-3 rounded-xl border border-purple-500/30 text-purple-500 hover:bg-purple-500 hover:text-white transition-all uppercase">Gestionar Logística</button>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="block w-full text-left text-[11px] font-black px-4 py-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase">SALIR</button>
          </div>
        )}
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
                <select 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black text-slate-700 cursor-pointer" 
                  value={form.paqueteId || ''} 
                  onChange={(e) => {
                    const idSeleccionado = e.target.value;
                    const paqueteEncontrado = paquetesDisponibles.find(p => p.id === idSeleccionado);
                    setForm({
                      ...form, 
                      paqueteId: idSeleccionado, 
                      precio: paqueteEncontrado ? paqueteEncontrado.precio : ''
                    });
                  }}
                >
                  <option value="">-- Selecciona un Plan --</option>
                  {paquetesDisponibles.map(paquete => (
                    <option key={paquete.id} value={paquete.id}>
                      {paquete.nombre} ({paquete.velocidad} Mbps)
                    </option>
                  ))}
                </select>

                <input 
                  required disabled
                  type="number" 
                  className="w-full p-4 bg-slate-200 border border-slate-300 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed transition-all" 
                  placeholder="Precio automático" 
                  value={form.precio || ''} 
                />
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

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                  Teléfono (WhatsApp)
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: 3121887170"
                  value={form.telefono}
                  onChange={(e) => setForm({...form, telefono: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold placeholder:text-slate-400 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold disabled:opacity-40" placeholder="Nombre de Usuario" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              
              <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="Contraseña Temporal" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-sm tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 uppercase">
                {editandoId ? 'Guardar Cambios' : 'Registrar Cliente'}
              </button>
              {editandoId && <button type="button" onClick={cancelarEdicion} className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Cancelar</button>}
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: TABLA Y BOTONES MASIVOS */}
        <div className="lg:col-span-8">
          
          {/* TARJETA UNIFICADA DE ACCIONES MASIVAS (DISEÑO CORREGIDO) */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-6 gap-6">
            
            {/* Lado Izquierdo: Facturación */}
            <div className="flex flex-col items-center md:items-start w-full md:w-auto">
              <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase mb-3">Facturación Masiva</h3>
              <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={ejecutarCronManual}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow transition duration-200"
                  >
                    🤖 Ejecutar Procesos de Hoy
                  </button>
              </div>
            </div>

            {/* Separador Visual */}
            <div className="hidden md:block w-px h-12 bg-slate-200"></div>
            <div className="block md:hidden w-full h-px bg-slate-200 my-2"></div>

            {/* Lado Derecho: Importación */}
            <div className="flex flex-col items-center md:items-end w-full md:w-auto">
              <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase mb-3">Importar Catálogo</h3>
              <label className="bg-blue-500 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-md cursor-pointer flex items-center gap-2 tracking-wider">
                <span>📥 IMPORTAR CLIENTES (.CSV)</span>
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleImportarCSV} 
                />
              </label>
            </div>
            
          </div>


          {/* 🟢 BARRA DE BÚSQUEDA Y FILTROS MOVIDA AQUÍ 🟢 */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6 z-10 relative">
            <div className="relative w-full md:w-1/2">
              <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400 text-lg">🔍</span>
              <input
                type="text"
                placeholder="Buscar cliente..."
                className="w-full py-4 pl-14 pr-4 bg-white border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {['TODOS', 'DEUDORES', 'ACTIVOS', 'SUSPENDIDOS'].map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setFiltro(tipo)}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    filtro === tipo 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 border-transparent' 
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>
          {/* -------------------------------------------------- */}

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
                {clientesFiltrados.map(c => (
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
                                {/* <button onClick={() => marcarComoPagada(f.id)} className="bg-green-500 text-white p-1 rounded-lg text-[8px] font-black uppercase px-2">Pagado</button> */}
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
                            onClick={() => abrirModalFactura(c.servicios?.[0]?.id, c.servicios?.[0]?.precio, c.nombre)} 
                            className="mt-1 text-[10px] font-black text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 uppercase"
                          >
                            <span>+ Generar Cobro</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2 items-center flex-wrap">
                        <button onClick={() => abrirModalPago(c)} className="bg-green-50 p-3 rounded-2xl hover:bg-green-500 transition-colors group border border-green-100">
                           <span className="text-[10px] font-black text-green-600 group-hover:text-white uppercase">💳 Cobrar</span>
                        </button>

                        <button onClick={() => navigate(`/admin/cliente/${c.id}`)} className="bg-blue-50 p-3 rounded-2xl hover:bg-blue-500 transition-colors group border border-blue-100">
                           <span className="text-[10px] font-black text-blue-500 group-hover:text-white uppercase">👁️ Expediente</span>
                        </button>

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

      {/* MODAL DE PAGO */}
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
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Notas (Opcional)</label>
                <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" rows="2" value={pagoData.notas} onChange={e => setPagoData({...pagoData, notas: e.target.value})}></textarea>
              </div>

              <div className="mt-6 flex gap-2">
                <button type="submit" className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 transition-all">Registrar Pago</button>
                <button type="button" onClick={() => setShowModalPago(false)} className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE FACTURA */}
      {showModalFactura && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-1">Generar Cobro Manual</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
              Cliente: <span className="text-blue-500">{servicioActivoFactura?.cliente}</span>
            </p>

            <form onSubmit={handleGenerarFacturaSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Monto de la Factura ($)</label>
                <input required type="number" step="any" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xl font-black text-slate-800" value={facturaData.monto} onChange={e => setFacturaData({...facturaData, monto: e.target.value})} />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Concepto</label>
                <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" value={facturaData.concepto} onChange={e => setFacturaData({...facturaData, concepto: e.target.value})} />
              </div>

              <div className="mt-6 flex gap-2">
                <button type="submit" className="w-full bg-blue-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all">Generar Cobro</button>
                <button type="button" onClick={() => setShowModalFactura(false)} className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;