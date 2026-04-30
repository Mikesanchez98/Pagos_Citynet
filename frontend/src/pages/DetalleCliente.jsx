import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logoCitynet from '../assets/logo-citynet-antiguo.png';

const DetalleCliente = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal de Pago
  const [showModalPago, setShowModalPago] = useState(false);
  const [montoPago, setMontoPago] = useState("");

  useEffect(() => {
    fetchCliente();
  }, [id]);

  const fetchCliente = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3001/api/admin/cliente/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCliente(res.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const manejarPago = async () => {
    if (!montoPago || montoPago <= 0) return alert("Ingresa un monto válido");
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:3001/api/admin/cliente/${id}/pagar`, 
        { monto: montoPago },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMontoPago("");
      setShowModalPago(false);
      fetchCliente(); // Recargamos los datos para ver el nuevo pago en la lista
      alert("¡Pago registrado correctamente!");
    } catch (error) {
      alert("Error al procesar el pago");
    }
  };

  const descargarRecibo = async (pagoId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios({
        url: `http://localhost:3001/api/admin/pago/${pagoId}/pdf`,
        method: 'GET',
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Recibo_${cliente.nombre}_${pagoId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Error al generar PDF");
    }
  };

  if (loading) return <div className="p-10 text-center font-black text-slate-400">CARGANDO EXPEDIENTE...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white p-4 flex justify-between items-center px-8">
        <div className="flex items-center gap-4">
          <img src={logoCitynet} alt="Logo" className="h-8 brightness-0 invert" />
          <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase">Expediente de Cliente</span>
        </div>
        <button onClick={() => navigate('/admin')} className="text-[10px] font-black border border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-800 transition-all uppercase">
          Volver
        </button>
      </nav>

      <div className="max-w-5xl mx-auto mt-10 px-4">
        {/* CABECERA DE CLIENTE */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase">{cliente.nombre}</h1>
            <p className="text-slate-500 font-bold mt-1">📍 {cliente.direccion || 'Sin dirección registrada'}</p>
            <p className="text-slate-400 text-sm mt-1">📞 {cliente.telefono || 'Sin teléfono'}</p>
          </div>
          <div className="text-right flex flex-col items-end gap-3">
            <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase ${cliente.servicios[0]?.estado === 'ACTIVO' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {cliente.servicios[0]?.estado || 'SIN SERVICIO'}
            </span>
            <button 
              onClick={() => {
                setMontoPago(cliente.servicios[0]?.precio || "");
                setShowModalPago(true);
              }}
              className="bg-green-500 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase hover:bg-green-600 transition-all shadow-lg shadow-green-200"
            >
              💰 Registrar Pago
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* COLUMNA IZQUIERDA: SERVICIOS */}
          <div className="md:col-span-1">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Servicios Contratados</h2>
            {cliente.servicios.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500">
                <p className="text-xs font-black text-blue-500 uppercase">{s.plan}</p>
                <p className="text-2xl font-black text-slate-800 mt-1">${s.precio}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase">Corte: Día {s.diaPago || 'No definido'}</p>
              </div>
            ))}
          </div>

          {/* COLUMNA DERECHA: HISTORIAL DE PAGOS */}
          <div className="md:col-span-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Historial de Pagos</h2>
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Fecha</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Monto</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cliente.pagos.length > 0 ? cliente.pagos.map(p => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                      <td className="p-4 text-sm font-bold text-slate-700">{new Date(p.fecha).toLocaleDateString()}</td>
                      <td className="p-4 text-sm font-black text-green-600">${p.monto}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => descargarRecibo(p.id)}
                          className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all uppercase"
                        >
                          Descargar PDF
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="p-10 text-center text-slate-400 text-xs font-bold uppercase">No hay pagos registrados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE PAGO */}
      {showModalPago && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black text-slate-800 mb-2 uppercase">Registrar Cobro</h2>
            <p className="text-slate-400 text-xs font-bold mb-6 uppercase tracking-widest">Cliente: {cliente.nombre}</p>
            
            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Monto a cobrar ($)</label>
              <input 
                type="number" 
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-2xl font-black text-slate-800 focus:border-green-500 outline-none transition-all"
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowModalPago(false)}
                className="p-4 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={manejarPago}
                className="bg-green-500 p-4 rounded-2xl text-[10px] font-black uppercase text-white hover:bg-green-600 transition-all shadow-lg shadow-green-200"
              >
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DetalleCliente;