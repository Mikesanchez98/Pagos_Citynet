// src/pages/CobranzaMasiva.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CobranzaMasiva = () => {
  const navigate = useNavigate();
  const [clientesMorosos, setClientesMorosos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroGrupo, setFiltroGrupo] = useState('TODOS');
  
  // Guardamos los IDs de los clientes a los que ya les dimos clic en esta sesión
  const [enviados, setEnviados] = useState([]);

  useEffect(() => {
    fetchMorosos();
  }, []);

  const fetchMorosos = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      // Asumimos que tu endpoint principal trae a los clientes con sus facturas
      // Si tu backend tiene un endpoint específico para morosos, puedes cambiar esta URL
      const res = await axios.get('http://pagos-citynet.vercel.app/api/admin/clientes', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const todosLosClientes = res.data;

      // Filtramos solo a los que tienen teléfono y facturas pendientes
      const morosos = todosLosClientes.map(cliente => {
        const facturas = cliente?.servicios?.[0]?.facturas || [];
        const facturasPendientes = facturas.filter(f => !f.pagada);
        
        if (facturasPendientes.length > 0 && cliente.telefono) {
          const montoDeuda = facturasPendientes.reduce((acc, f) => acc + Number(f.monto || 0), 0);
          // Tomamos la fecha de la factura más antigua
          const fechaCorte = facturasPendientes[0]?.vencimiento;
          
          return {
            ...cliente,
            deudaTotal: montoDeuda.toFixed(2),
            fechaCorte: fechaCorte ? new Date(fechaCorte).toLocaleDateString() : 'Sin fecha',
            facturasPendientes: facturasPendientes.length
          };
        }
        return null;
      }).filter(Boolean); // Eliminamos los nulos

      setClientesMorosos(morosos);
    } catch (error) {
      console.error("Error al cargar clientes para cobranza:", error);
    } finally {
      setLoading(false);
    }
  };

  const enviarWhatsApp = (cliente) => {
    const mensaje = `Hola *${cliente.nombre}*, te saludamos de *Citynet*. 🌐\n\nTe recordamos que presentas un saldo pendiente de *$${cliente.deudaTotal}* correspondiente a tu servicio de internet (Día de cobro: ${cliente.diaCobro}).\n\nPuedes realizar tu pago vía transferencia, OXXO o en nuestras oficinas.\n\n_Si ya realizaste tu pago, por favor omite este mensaje. ¡Gracias!_`;
    
    const numeroLimpio = cliente.telefono.replace(/\D/g, '');
    const numeroFinal = numeroLimpio.length === 10 ? `52${numeroLimpio}` : numeroLimpio;

    // Marcamos como enviado en la interfaz
    if (!enviados.includes(cliente.id)) {
      setEnviados([...enviados, cliente.id]);
    }

    // Abrimos el chat
    window.open(`https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // Filtrado por grupo
  const clientesFiltrados = filtroGrupo === 'TODOS' 
    ? clientesMorosos 
    : clientesMorosos.filter(c => String(c.diaCobro) === filtroGrupo);

  // Extraemos los grupos únicos para el select del filtro
  const gruposDisponibles = [...new Set(clientesMorosos.map(c => String(c.diaCobro)))].sort();

  if (loading) return <div className="p-20 text-center font-black text-slate-500 uppercase tracking-widest">Cargando Gestor...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center px-8 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-[10px] font-black px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all uppercase">
            ⬅ Volver al Panel
          </button>
          <span className="text-[10px] font-black tracking-[0.3em] text-orange-400 border-l border-slate-700 pl-4 uppercase">Gestor de Cobranza</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto mt-8 px-4 space-y-8">
        
        {/* CABECERA Y FILTROS */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase mb-2">Cobranza Activa</h1>
            <p className="text-sm font-bold text-slate-500">
              Tienes <span className="text-red-500 font-black">{clientesMorosos.length} clientes</span> con adeudo y número de WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex flex-col w-full md:w-auto">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 ml-2">Filtrar por Día/Grupo</label>
              <select 
                value={filtroGrupo} 
                onChange={(e) => setFiltroGrupo(e.target.value)}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 uppercase"
              >
                <option value="TODOS">Todos los grupos</option>
                {gruposDisponibles.map(grupo => (
                  <option key={grupo} value={grupo}>Grupo {grupo}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* LISTA DE MOROSOS */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          {clientesFiltrados.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {clientesFiltrados.map((cliente) => {
                const yaEnviado = enviados.includes(cliente.id);
                
                return (
                  <div key={cliente.id} className={`p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${yaEnviado ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black text-slate-800 uppercase">{cliente.nombre}</h3>
                        {yaEnviado && <span className="px-2 py-1 bg-green-100 text-green-600 rounded-md text-[8px] font-black uppercase tracking-widest">Enviado ✔</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase">Día: {cliente.diaCobro}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase">Facturas: {cliente.facturasPendientes}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase">Corte: {cliente.fechaCorte}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Deuda Total</p>
                        <p className="text-xl font-black text-red-500">${cliente.deudaTotal}</p>
                      </div>
                      
                      <button 
                        onClick={() => enviarWhatsApp(cliente)}
                        className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                          yaEnviado 
                            ? 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200' 
                            : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200'
                        }`}
                      >
                        {yaEnviado ? 'Reenviar 💬' : 'Enviar Aviso 🔔'}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-20 text-center">
              <span className="text-4xl mb-4 block">🎉</span>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No hay clientes con adeudo en este filtro.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CobranzaMasiva;