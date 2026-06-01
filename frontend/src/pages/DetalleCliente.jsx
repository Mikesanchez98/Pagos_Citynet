// src/pages/DetalleCliente.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

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
  const facturas = servicioPrincipal?.facturas || [];
  const pagos = cliente?.pagos || [];

  // 🟢 NUEVO: CÁLCULOS DE BALANCE DE CUENTA
  const deudaTotal = facturas
    .filter(f => !f.pagada)
    .reduce((total, f) => total + parseFloat(f.monto || 0), 0);
  const saldoAFavor = parseFloat(cliente?.saldo || 0);

  // --- FUNCIONES DE PAGOS ---
  const abrirModalPago = () => {
    const precioSugerido = deudaTotal > 0 ? deudaTotal : (servicioPrincipal?.precio || '');
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
      
      // 🟢 REFRESCAR DATOS: Llama a la función que recarga la info del cliente 
      // para que el pago desaparezca de la lista de inmediato (ej: fetchClienteDatos())
      if (typeof fetchClienteDatos === 'function') {
        fetchClienteDatos(); 
      } else {
        window.location.reload(); // Alternativa rápida si no tienes la función a la mano
      }

    } catch (error) {
      console.error("Error al cancelar el cobro:", error);
      alert(error.response?.data?.error || "Hubo un error al intentar cancelar el pago.");
    }
  };

  // --- FUNCIONES DE FACTURACIÓN ---
  const abrirModalFactura = () => {
    if (!servicioPrincipal) return alert("Este cliente no tiene un servicio activo.");
    setFacturaData({ monto: servicioPrincipal.precio });
    setShowModalFactura(true);
  };

  const handleGenerarFactura = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await api.post(`/admin/servicio/${servicioPrincipal.id}/generar-factura`, 
        { monto: facturaData.monto }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Factura generada exitosamente");
      setShowModalFactura(false);
      fetchClienteDetalle();
    } catch (err) { 
      alert("Error al generar factura manual"); 
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
            <p className="text-sm font-bold text-slate-500">📍 {cliente.direccion || 'Sin dirección registrada'}</p>
            
            <div className="flex gap-4 mt-4 flex-wrap items-center">
              <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg border border-slate-200 text-xs font-black uppercase flex items-center h-8">
                ID: {cliente.numCliente}
              </span>
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-200 text-xs font-black uppercase flex items-center h-8">
                Grupo: {cliente.diaCobro}
              </span>
              
              {cliente.telefono && (
                <div className="flex gap-2">
                  <button onClick={abrirWhatsApp} className="bg-green-50 text-green-600 hover:bg-green-500 hover:text-white px-4 rounded-lg border border-green-200 text-xs font-black uppercase flex items-center gap-2 transition-all h-8">
                    <span className="text-sm">💬</span> Chat
                  </button>
                  <button onClick={enviarRecordatorioPago} className="bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white px-4 rounded-lg border border-orange-200 text-xs font-black uppercase flex items-center gap-2 transition-all h-8">
                    <span className="text-sm">🔔</span> Cobrar
                  </button>
                </div>
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
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Detalles del Servicio</h3>
            {servicioPrincipal ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Plan Contratado</p>
                  <p className="text-lg font-black text-blue-600">{servicioPrincipal.plan}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Mensualidad</p>
                  <p className="text-lg font-black text-slate-800">${servicioPrincipal.precio}</p>
                </div>
                
                {/* 🟢 NUEVO: BOTÓN QUE ABRE EL MODAL DE FACTURA */}
                <button onClick={abrirModalFactura} className="w-full mt-4 bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all">
                  + Generar Factura Manual
                </button>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400">Este cliente no tiene un servicio activo registrado.</p>
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
                          {!estaPagada && (
                            <button onClick={() => marcarComoPagada(idFact)} disabled={!idFact} className="flex-1 sm:flex-none bg-green-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-green-600 transition-all disabled:opacity-50">
                              Marcar Pagada
                            </button>
                          )}
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
              Servicio: <span className="text-blue-500">{servicioPrincipal?.plan}</span>
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

    </div>
  );
};

export default DetalleCliente;