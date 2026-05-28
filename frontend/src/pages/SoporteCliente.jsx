import React, { useState } from 'react';
import axios from 'axios';

const SoporteCliente = ({ clienteId }) => {
  const [titulo, setTitulo] = useState('Sin conexión a Internet');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const enviarTicket = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje(null);

    try {
      const token = localStorage.getItem('token'); // Asumiendo que usas token para el cliente
      // Ajusta la URL a la ruta de tu backend para clientes
      await axios.post('https://pagos-citynet.vercel.app/api/cliente/mis-tickets', {
        clienteId: clienteId, // Asegúrate de pasar el ID del cliente logueado
        titulo,
        descripcion
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMensaje({ tipo: 'exito', texto: '¡Tu reporte ha sido enviado! Un técnico lo revisará pronto.' });
      setDescripcion(''); // Limpiamos el formulario
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Hubo un error al enviar tu reporte. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-lg mx-auto mt-8">
      <h2 className="text-xl font-black text-slate-800 uppercase mb-2">Reportar una Falla 🛠️</h2>
      <p className="text-sm font-bold text-slate-500 mb-6">¿Tienes problemas con tu servicio? Levanta un ticket y te atenderemos a la brevedad.</p>

      {mensaje && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-bold ${mensaje.tipo === 'exito' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={enviarTicket} className="space-y-4">
        <div className="flex flex-col">
          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 ml-2">Tipo de Problema</label>
          <select 
            value={titulo} 
            onChange={(e) => setTitulo(e.target.value)}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
          >
            <option value="Sin conexión a Internet">Sin conexión a Internet</option>
            <option value="Internet muy lento">Internet muy lento</option>
            <option value="Falla en el Router/Módem">Falla en el Router / Módem</option>
            <option value="Cambio de Domicilio">Solicitud: Cambio de Domicilio</option>
            <option value="Otro">Otro problema</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 ml-2">Detalles (Opcional)</label>
          <textarea 
            rows="3"
            placeholder="Describe brevemente qué luces están encendidas o desde cuándo ocurre la falla..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
          ></textarea>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-slate-900 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:bg-slate-400"
        >
          {loading ? 'Enviando...' : 'Enviar Reporte 🚀'}
        </button>
      </form>
    </div>
  );
};

export default SoporteCliente;