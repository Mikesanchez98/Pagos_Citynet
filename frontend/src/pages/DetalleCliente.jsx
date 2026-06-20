// src/pages/DetalleCliente.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import MapaPinSelector from '../components/MapaPinSelector';

const DetalleCliente = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados del Modal de Pago
  const [showModalPago, setShowModalPago] = useState(false);
  const [pagoData, setPagoData] = useState({
    monto: '', mesCorrespondiente: '', metodoPago: 'Efectivo', notas: ''
  });

  // 🟢 NUEVO: Estados del Modal de Factura Manual
  const [showModalFactura, setShowModalFactura] = useState(false);
  const [facturaData, setFacturaData] = useState({ monto: '' });

  useEffect(() => {
    fetchClienteDetalle();
    cargarCatalogos();
  }, [id]);

  const fetchClienteDetalle = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');
      
      const res = await api.get(`/admin/cliente/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCliente(res.data);
    } catch (error) {
      console.error("Error al cargar el expediente:", error);
    } finally {
      setLoading(false);
    }
  };

  // EXTRACCIÓN SEGURA DE DATOS 
  const servicioPrincipal = cliente?.servicios?.[0];
  const facturas = cliente?.facturas || [];
  const pagos = cliente?.pagos || [];

  // 🟢 NUEVO: CÁLCULOS DE BALANCE DE CUENTA
  const deudaTotal = facturas
    .filter(f => !f.pagada)
    .reduce((total, f) => total + parseFloat(f.monto || 0), 0);
  const saldoAFavor = parseFloat(cliente?.saldo || 0);

  //Estados para el nuevo servicio
  const [mostrarModalServicio, setMostrarModalServicio] = useState(false);
  const [formServicio, setFormServicio] = useState({
    direccion: '', ip: '', paqueteId: '', torreId: '', latitud: '', longitud: ''
  });
  const [paquetesDisponibles, setPaquetesDisponibles] = useState([]);
  const [torresDisponibles, setTorresDisponibles] = useState([]);
  const [geocodingKeyServicio, setGeocodingKeyServicio] = useState(0);

  // 🟢 1. CARGAR CATÁLOGOS CON LAS RUTAS REALES
  const cargarCatalogos = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Cargar Paquetes (Según tu AdminPanel, esta ruta va sin prefijo /admin)
      try {
        const resPaquetes = await api.get('/paquetes');
        if (resPaquetes && resPaquetes.data) setPaquetesDisponibles(resPaquetes.data);
      } catch (err) { console.error("Error al cargar paquetes:", err); }

      // Cargar Torres (Según tu AdminPanel, esta sí lleva /admin/torres)
      try {
        const resTorres = await api.get('/admin/torres', config);
        if (resTorres && resTorres.data) setTorresDisponibles(resTorres.data);
      } catch (err) { console.error("Error al cargar torres:", err); }

    } catch (error) { console.error("Error general en catálogos:", error); }
  };


  // 🟢 2. ABRIR MODAL FACTURA (Agregando el campo 'concepto')
  const abrirModalFactura = (servicio = null) => {
    if (servicio) {
      // 🎯 FLUJO INDIVIDUAL: Se presionó el botón de una instalación
      setFacturaData({ 
        monto: servicio.paquete?.precio || 0,
        servicioId: servicio.id,
        tipo: 'individual', // 👈 Guardamos el tipo
        concepto: `Mensualidad de Internet - ${servicio.paquete?.nombre || ''}`
      });
    } else {
      // 🌎 FLUJO GLOBAL: Se presionó el botón general de abajo
      const serviciosActivos = cliente?.servicios?.filter(s => s.estado === 'ACTIVO') || [];
      
      if (serviciosActivos.length === 0) {
        return alert("Este cliente no tiene servicios activos para facturar de forma global.");
      }

      const totalSugerido = serviciosActivos.reduce((sum, s) => sum + (s.paquete?.precio || 0), 0);
      const conceptoText = serviciosActivos.length > 1 
        ? `Mensualidad global de ${serviciosActivos.length} servicios activos`
        : `Mensualidad de Internet - ${serviciosActivos[0]?.paquete?.nombre}`;

      setFacturaData({ 
        monto: totalSugerido,
        servicioId: null,
        tipo: 'global', // 👈 Guardamos el tipo
        concepto: conceptoText
      });
    }
    
    setShowModalFactura(true);
  };

  // 🟢 3. SUBMIT DE LA FACTURA (Con todo el cuerpo de datos que pide tu backend)
  const handleGenerarFactura = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // 🧠 Decidimos la URL dinámicamente según el botón que se usó
      const urlDestino = facturaData.tipo === 'individual'
        ? `/admin/servicio/${facturaData.servicioId}/generar-factura`
        : `/admin/cliente/${cliente.id}/generar-factura`;
      
      await api.post(urlDestino, 
        { 
          monto: facturaData.monto,
          concepto: facturaData.concepto
        }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`Factura generada con éxito (${facturaData.tipo.toUpperCase()})`);
      setShowModalFactura(false);
      
      if (typeof fetchClienteDetalle === 'function') fetchClienteDetalle();
    } catch (err) { 
      console.error("Error al generar factura manual:", err);
      alert("Error al generar la factura"); 
    }
  };

  //Funcion para guardar el servicio extra
  const handleAgregarServicio = async (e) => {
    e.preventDefault();
    try{
      const token = localStorage.getItem('token');
      await api.post(`/admin/cliente/${cliente.id}/servicio`, formServicio, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("Nuevo servicio registrado con éxito");
      setMostrarModalServicio(false);
      setFormServicio({ direccion: '', ip: '', paqueteId: '', torreId: '', latitud: '', longitud: '' });

      fetchClienteDetalle();
    } catch(error){
      console.error("Error al registrar el nuevo servicio:", error);
      alert("Hubo un error al intentar agregar el servicio");
    }
  };

  const geocodificarServicio = async (direccion) => {
    if (!direccion || direccion.trim().length < 5) return;
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/admin/geocodificar?q=${encodeURIComponent(direccion)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormServicio(prev => ({ ...prev, latitud: res.data.latitud, longitud: res.data.longitud }));
      setGeocodingKeyServicio(k => k + 1); // re-centra el mapa sin re-montarlo
    } catch (err) {
      console.warn('No se pudo geocodificar la dirección:', err.response?.data?.error || err.message);
    }
  };

  // --- FUNCIONES DE PAGOS ---
  const abrirModalPago = () => {
    const precioSugerido = deudaTotal > 0 ? deudaTotal : (servicioPrincipal?.paquete?.precio || '');
    setPagoData({ monto: precioSugerido, mesCorrespondiente: '', metodoPago: 'Efectivo', notas: '' });
    setShowModalPago(true);
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await api.post('/admin/pagos', 
        { clienteId: cliente.id, ...pagoData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Pago registrado con éxito");
      setShowModalPago(false);
      fetchClienteDetalle(); 
    } catch (error) {
      alert("Hubo un error al registrar el pago.");
    }
  };

  const handleCancelarPago = async (pagoId) => {
    // Alerta de confirmación nativa para evitar clicks por accidente
    const confirmar = window.confirm("¿Estás completamente seguro de cancelar este pago? Esto volverá a poner la factura de ese mes como PENDIENTE de pago.");
    
    if (!confirmar) return;

    try {
      const token = localStorage.getItem('token');
      
      // Llamada a la nueva ruta del backend
      await api.post(`/admin/pagos/${pagoId}/cancelar`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("Cobro cancelado con éxito. La cuenta del cliente ha sido actualizada.");
      fetchClienteDetalle();

    } catch (error) {
      console.error("Error al cancelar el cobro:", error);
      alert(error.response?.data?.error || "Hubo un error al intentar cancelar el pago.");
    }
  };

  const marcarComoPagada = async (facturaId) => {
    if (!facturaId) return alert("Error: ID de factura no válido");
    if (!window.confirm("¿Confirmas que esta factura ha sido pagada?")) return;
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/admin/factura/${facturaId}/pagar`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchClienteDetalle();
    } catch (err) { alert("Error al actualizar la factura"); }
  };

  const descargarRecibo = (facturaId) => {
    if (!facturaId) return alert("Error: No se puede generar PDF sin un ID");
    const token = localStorage.getItem('token');
    window.open(`/admin/factura/${facturaId}/pdf?token=${token}`, '_blank');
  };

  // --- FUNCIONES DE WHATSAPP ---
  const abrirWhatsApp = () => {
    if (!cliente?.telefono) return;
    const numeroLimpio = cliente.telefono.replace(/\D/g, '');
    const numeroFinal = numeroLimpio.length === 10 ? `52${numeroLimpio}` : numeroLimpio;
    window.open(`https://wa.me/${numeroFinal}`, '_blank');
  };

  const enviarRecordatorioPago = () => {
    if (!cliente?.telefono) return alert("El cliente no tiene teléfono registrado.");
    const facturasPendientes = facturas.filter(f => !f.pagada);
    
    if (facturasPendientes.length === 0) {
      return alert("El cliente está al día. No hay facturas pendientes para cobrar.");
    }

    const facturaMasAntigua = facturasPendientes[0];
    const fechaValida = facturaMasAntigua?.vencimiento && !isNaN(new Date(facturaMasAntigua.vencimiento).getTime());
    const fechaTexto = fechaValida ? new Date(facturaMasAntigua.vencimiento).toLocaleDateString() : 'tu fecha de corte';

    const mensaje = `Hola *${cliente.nombre}*, te saludamos de *Citynet*. 🌐\n\nTe recordamos que presentas un saldo pendiente de *$${deudaTotal.toFixed(2)}* correspondiente a tu servicio de internet. Tu fecha límite de pago es/fue el *${fechaTexto}*.\n\nPuedes realizar tu pago vía transferencia, OXXO o en nuestras oficinas.\n\n_Si ya realizaste tu pago, por favor omite este mensaje. ¡Muchas gracias por tu preferencia!_`;

    const numeroLimpio = cliente.telefono.replace(/\D/g, '');
    const numeroFinal = numeroLimpio.length === 10 ? `52${numeroLimpio}` : numeroLimpio;

    window.open(`https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-500 uppercase tracking-widest">Cargando Expediente...</div>;
  if (!cliente) return <div className="p-20 text-center font-black text-red-500 uppercase tracking-widest">Cliente no encontrado</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* NAVBAR SUPERIOR */}
      <nav className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center px-8 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-[10px] font-black px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all uppercase">
            ⬅ Volver al Panel
          </button>
          <span className="text-[10px] font-black tracking-[0.3em] text-blue-400 border-l border-slate-700 pl-4 uppercase">Expediente Digital</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto mt-8 px-4 space-y-8">
        
        {/* TARJETA PRINCIPAL DEL CLIENTE */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-slate-800 uppercase">{cliente.nombre}</h1>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${servicioPrincipal?.estado === 'ACTIVO' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {servicioPrincipal?.estado || 'SIN SERVICIO'}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-500">📍 {servicioPrincipal?.direccion || 'Sin dirección registrada'}</p>
            
            <div className="flex gap-4 mt-4 flex-wrap items-center">
              <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg border border-slate-200 text-xs font-black uppercase flex items-center h-8">
                ID: {cliente.numCliente}
              </span>
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-200 text-xs font-black uppercase flex items-center h-8">
                Grupo: {cliente.diaCobro}
              </span>

              {cliente.telefono ? (
                <>
                  <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg border border-slate-200 text-xs font-black flex items-center h-8">
                    📞 {cliente.telefono}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={abrirWhatsApp} className="bg-green-50 text-green-600 hover:bg-green-500 hover:text-white px-4 rounded-lg border border-green-200 text-xs font-black uppercase flex items-center gap-2 transition-all h-8">
                      <span className="text-sm">💬</span> Chat
                    </button>
                    <button onClick={enviarRecordatorioPago} className="bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white px-4 rounded-lg border border-orange-200 text-xs font-black uppercase flex items-center gap-2 transition-all h-8">
                      <span className="text-sm">🔔</span> Cobrar
                    </button>
                  </div>
                </>
              ) : (
                <span className="bg-slate-50 text-slate-400 px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold flex items-center h-8">
                  Sin teléfono
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col w-full md:w-auto">
            {/* 🟢 NUEVO: TARJETAS DE BALANCE */}
            <div className="flex gap-3 mb-4">
              <div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex-1 flex flex-col justify-center items-center min-w-[120px]">
                <span className="text-[9px] font-black text-red-500 uppercase tracking-wider mb-1">Deuda Total</span>
                <span className="text-xl font-black text-red-700">${deudaTotal.toFixed(2)}</span>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl flex-1 flex flex-col justify-center items-center min-w-[120px]">
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-wider mb-1">Saldo a Favor</span>
                <span className="text-xl font-black text-blue-700">${saldoAFavor.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={abrirModalPago} className="w-full bg-green-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 shadow-lg shadow-green-200 transition-all text-center">
              💳 Registrar Pago Directo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
         {/* COLUMNA IZQ: DETALLES DEL SERVICIO */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-fit">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Instalaciones</h3>
              {/* Botón para abrir el formulario del nuevo servicio */}
              <button 
                onClick={() => setMostrarModalServicio(true)} 
                className="bg-blue-100 text-blue-600 px-3 py-1 text-[10px] font-black uppercase rounded-lg hover:bg-blue-200 transition-all"
              >
                + Añadir
              </button>
            </div>

            {cliente.servicios && cliente.servicios.length > 0 ? (
              <div className="space-y-4">
                {cliente.servicios.map((servicio, index) => (
                  <div key={servicio.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div> {/* Línea decorativa */}
                    
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Instalación #{index + 1}</p>
                        <p className="text-sm font-bold text-slate-800 mt-1">{servicio.direccion || 'Sin dirección registrada'}</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${servicio.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {servicio.estado}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Plan Contratado</p>
                        <p className="text-sm font-black text-blue-600">{servicio.paquete?.nombre || 'Sin plan'}</p>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Mensualidad</p>
                        <p className="text-sm font-black text-slate-800">${servicio.paquete?.precio || 0}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 mb-4 text-xs font-mono text-slate-500">
                      📡 IP: <span className="font-bold text-slate-700">{servicio.direccionIp || 'N/A'}</span>
                    </div>

                    {/* 🟢 NUEVO: BOTÓN MOVIDO AQUÍ ADENTRO DEL .map() */}
                    {/* Ahora le pasamos la variable "servicio" específica de esta iteración */}
                    <button 
                      onClick={() => abrirModalFactura(servicio)} 
                      className="w-full bg-white border-2 border-slate-200 text-slate-600 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all"
                    >
                      + Facturar este servicio
                    </button>
                  </div>
                ))}
                {/* Al final de tu contenedor de instalaciones, fuera del .map() */}
                <button 
                  onClick={() => abrirModalFactura()} 
                  className="w-full mt-4 bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all"
                >
                  + Generar Factura Mensual (Global)
                </button>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 text-center py-4">Este cliente no tiene servicios activos.</p>
            )}
          </div>

          {/* COLUMNA CENTRO/DER: FACTURAS Y PAGOS */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* FACTURAS */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Facturas Emitidas</h3>
              
              {facturas.length > 0 ? (
                <div className="space-y-3">
                  {facturas.map((factura, index) => {
                    const idFact = factura?.id;
                    const montoFact = factura?.monto ? Number(factura.monto).toFixed(2) : '0.00';
                    const estaPagada = factura?.pagada === true;
                    const fechaEsValida = factura?.vencimiento && !isNaN(new Date(factura.vencimiento).getTime());
                    
                    return (
                      <div key={idFact || index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800">${montoFact}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${estaPagada ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                              {estaPagada ? 'Pagada' : 'Pendiente'}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">
                            Vencimiento: {fechaEsValida ? new Date(factura.vencimiento).toLocaleDateString() : 'Sin fecha / Inválida'}
                          </p>
                          <p className="text-[9px] font-bold text-slate-300 mt-0.5">Folio: #{idFact || 'Error de ID'}</p>
                        </div>
                        
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => descargarRecibo(idFact)} disabled={!idFact} className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-100 transition-all disabled:opacity-50 flex items-center justify-center gap-1">
                            📄 PDF
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay facturas registradas</p>
                </div>
              )}
            </div>

            {/* PAGOS */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Historial de Pagos</h3>
              
              {pagos.length > 0 ? (
                <div className="space-y-3">
                  {pagos.map((pago, index) => (
                    <div key={pago?.id || index} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 gap-4">
                      <div>
                        <p className="font-black text-green-600">+ ${pago?.monto}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">Método: {pago?.metodoPago}</p>
                      </div>
                      
                      {/* Agrupamos la fecha y el nuevo botón de cancelación a la derecha */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{pago?.mesCorrespondiente}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">{pago?.fecha ? new Date(pago.fecha).toLocaleDateString() : ''}</p>
                        </div>
                        
                        {/* Botón Cancelar */}
                        <button 
                          onClick={() => handleCancelarPago(pago?.id)} 
                          disabled={!pago?.id}
                          className="px-3 py-2 text-[9px] font-black tracking-wider uppercase text-red-500 border border-red-200 bg-red-50/30 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay pagos registrados</p>
                </div>
              )}
            </div>

          </div>
        </div>  
      </div>

      {/* MODAL DE PAGO COMPLETO */}
      {showModalPago && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-1">Registrar Pago</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
              Cliente: <span className="text-blue-500">{cliente?.nombre}</span>
            </p>

            <form onSubmit={handleRegistrarPago} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Monto a cobrar ($)</label>
                <input required type="number" step="any" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xl font-black text-slate-800" value={pagoData.monto} onChange={e => setPagoData({...pagoData, monto: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Mes a saldar</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="Ej. Abril 2026" value={pagoData.mesCorrespondiente} onChange={e => setPagoData({...pagoData, mesCorrespondiente: e.target.value})} />
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
                <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="Ej. Dejó saldo a cuenta" value={pagoData.notas} onChange={e => setPagoData({...pagoData, notas: e.target.value})} />
              </div>

              <div className="flex gap-4 mt-6">
                <button type="button" onClick={() => setShowModalPago(false)} className="flex-1 p-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 p-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200 transition-all">Confirmar Pago</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 NUEVO: MODAL DE FACTURA MANUAL */}
      {showModalFactura && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-1">Generar Factura</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
              Servicio: <span className="text-blue-500">{facturaData.planNombre}</span>
            </p>

            <form onSubmit={handleGenerarFactura} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-4 mb-1 block uppercase">Monto de la Factura ($)</label>
                <input 
                  required 
                  type="number" 
                  step="any" 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xl font-black text-slate-800" 
                  value={facturaData.monto} 
                  onChange={e => setFacturaData({...facturaData, monto: e.target.value})} 
                />
                <p className="text-[9px] text-slate-400 mt-2 ml-2 font-bold">Por defecto se sugiere el costo de la mensualidad, pero puedes modificarlo.</p>
              </div>

              <div className="flex gap-4 mt-6">
                <button type="button" onClick={() => setShowModalFactura(false)} className="flex-1 p-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 p-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-200 transition-all">Generar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: AGREGAR NUEVO SERVICIO/INSTALACIÓN
          ========================================== */}
      {mostrarModalServicio && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="p-8">
              <h2 className="text-xl font-black text-slate-800 mb-6">Añadir Nueva Instalación</h2>
              
              <form onSubmit={handleAgregarServicio} className="space-y-4">
                
                {/* Dirección */}
                <input
                  required
                  type="text"
                  placeholder="Dirección de la nueva instalación"
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold placeholder:text-slate-400"
                  value={formServicio.direccion}
                  onChange={e => setFormServicio({...formServicio, direccion: e.target.value})}
                  onBlur={e => geocodificarServicio(e.target.value)}
                />

                {/* IP y Torre */}
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    required 
                    type="text" 
                    placeholder="IP (Ej: 192.168.1.50)" 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono font-bold text-blue-600 placeholder:text-slate-400"
                    value={formServicio.ip} 
                    onChange={e => setFormServicio({...formServicio, ip: e.target.value})} 
                  />
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-600"
                    value={formServicio.torreId} 
                    onChange={e => setFormServicio({...formServicio, torreId: e.target.value})}
                  >
                    <option value="">-- Torre (Opcional) --</option>
                    {torresDisponibles.map(torre => (
                      <option key={torre.id} value={torre.id}>{torre.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Coordenadas */}
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number" step="any"
                    placeholder="Latitud"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold placeholder:text-slate-400"
                    value={formServicio.latitud}
                    onChange={e => setFormServicio({...formServicio, latitud: e.target.value})}
                  />
                  <input
                    type="number" step="any"
                    placeholder="Longitud"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold placeholder:text-slate-400"
                    value={formServicio.longitud}
                    onChange={e => setFormServicio({...formServicio, longitud: e.target.value})}
                  />
                </div>

                <MapaPinSelector
                  lat={formServicio.latitud}
                  lng={formServicio.longitud}
                  triggerKey={geocodingKeyServicio}
                  onChange={(lat, lng) => setFormServicio(prev => ({ ...prev, latitud: lat, longitud: lng }))}
                />

                {/* Paquete */}
                <select 
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 cursor-pointer"
                  value={formServicio.paqueteId} 
                  onChange={e => setFormServicio({...formServicio, paqueteId: e.target.value})}
                >
                  <option value="">-- Selecciona un Plan --</option>
                  {paquetesDisponibles.map(paquete => (
                    <option key={paquete.id} value={paquete.id}>
                      {paquete.nombre} ({paquete.velocidad} Mbps) - ${paquete.precio}
                    </option>
                  ))}
                </select>

                {/* Botones de acción */}
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setMostrarModalServicio(false)} 
                    className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                  >
                    Guardar
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DetalleCliente;