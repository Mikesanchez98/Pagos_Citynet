import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const DetalleCliente = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showModalPago, setShowModalPago] = useState(false);
  const [pagoData, setPagoData] = useState({
    monto: '', mesCorrespondiente: '', metodoPago: 'Efectivo', notas: ''
  });

  useEffect(() => {
    fetchClienteDetalle();
  }, [id]);

  const fetchClienteDetalle = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');
      
      const res = await axios.get(`http://localhost:3001/api/admin/cliente/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 🕵️ LOG DE DEPURACIÓN PRINCIPAL
      console.log("📥 DATOS CRUDOS DEL BACKEND:", res.data);
      
      setCliente(res.data);
    } catch (error) {
      console.error("Error al cargar el expediente:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCIONES DE FACTURACIÓN Y PAGOS ---
  const abrirModalPago = () => {
    const precioSugerido = cliente?.servicios?.[0]?.precio || '';
    setPagoData({ monto: precioSugerido, mesCorrespondiente: '', metodoPago: 'Efectivo', notas: '' });
    setShowModalPago(true);
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3001/api/admin/pagos', 
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

  const marcarComoPagada = async (facturaId) => {
    if (!facturaId) return alert("Error: ID de factura no válido");
    if (!window.confirm("¿Confirmas que esta factura ha sido pagada?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:3001/api/admin/factura/${facturaId}/pagar`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchClienteDetalle();
    } catch (err) { alert("Error al actualizar la factura"); }
  };

  const generarFactura = async (servicioId, precio) => {
    if(!window.confirm("¿Generar una nueva factura manual para este cliente?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:3001/api/admin/servicio/${servicioId}/generar-factura`, 
        { servicioId, monto: precio }, 
        {headers: { Authorization: `Bearer ${token}` }
      });
      fetchClienteDetalle();
    } catch (err) { alert("Error al generar factura"); }
  };

  const descargarRecibo = (facturaId) => {
    if (!facturaId) return alert("Error: No se puede generar PDF sin un ID");
    const token = localStorage.getItem('token');
    window.open(`http://localhost:3001/api/admin/factura/${facturaId}/pdf?token=${token}`, '_blank');
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-500 uppercase tracking-widest">Cargando Expediente...</div>;
  if (!cliente) return <div className="p-20 text-center font-black text-red-500 uppercase tracking-widest">Cliente no encontrado</div>;

  // EXTRACCIÓN SEGURA DE DATOS
  const servicioPrincipal = cliente?.servicios?.[0];
  const facturas = servicioPrincipal?.facturas || [];
  const pagos = cliente?.pagos || [];

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
            <div className="flex gap-4 mt-4">
              <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg border border-slate-200 text-xs font-black uppercase">ID: {cliente.numCliente}</span>
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-200 text-xs font-black uppercase">Grupo: {cliente.diaCobro}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button onClick={abrirModalPago} className="bg-green-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 shadow-lg shadow-green-200 transition-all text-center">
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
                
                <button onClick={() => generarFactura(servicioPrincipal.id, servicioPrincipal.precio)} className="w-full mt-4 bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all">
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
                    // VARIABLES SEGURAS: Si algo falla, se protege aquí
                    const idFact = factura?.id;
                    const montoFact = factura?.monto ? Number(factura.monto).toFixed(2) : '0.00';
                    const estaPagada = factura?.pagada === true;
                    // Aseguramos que la fecha sea válida antes de formatearla
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
                            <button 
                              onClick={() => marcarComoPagada(idFact)}
                              disabled={!idFact}
                              className="flex-1 sm:flex-none bg-green-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-green-600 transition-all disabled:opacity-50"
                            >
                              Marcar Pagada
                            </button>
                          )}
                          <button 
                            onClick={() => descargarRecibo(idFact)}
                            disabled={!idFact}
                            className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-100 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                          >
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
                    <div key={pago?.id || index} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="font-black text-green-600">+ ${pago?.monto}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">Método: {pago?.metodoPago}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{pago?.mesCorrespondiente}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">{pago?.fecha ? new Date(pago.fecha).toLocaleDateString() : ''}</p>
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

      {/* MODAL DE PAGO OCULTO POR ESPACIO */}
      {showModalPago && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            {/* Contenido del modal (puedes dejar el que ya tenías) */}
            <div className="bg-white p-8 rounded-3xl w-full max-w-md">
                <h3 className="text-xl font-black mb-4">Confirmar Pago</h3>
                <button onClick={() => handleRegistrarPago({preventDefault: () => {}})} className="bg-green-500 text-white w-full p-4 rounded-xl font-bold">Cobrar {pagoData.monto}</button>
                <button onClick={() => setShowModalPago(false)} className="bg-slate-100 text-slate-600 w-full p-4 rounded-xl mt-2 font-bold">Cancelar</button>
            </div>
        </div>
      )}

    </div>
  );
};

export default DetalleCliente;