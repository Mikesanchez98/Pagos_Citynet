// src/pages/CobranzaMasiva.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const CobranzaMasiva = () => {
  const navigate = useNavigate();
  const [clientesMorosos, setClientesMorosos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroGrupo, setFiltroGrupo] = useState('TODOS');
  const [enviandoMasivo, setEnviandoMasivo] = useState(false);
  
  // 🟢 ESTADO LIMPIO: Almacenado solo en RAM. Se borra automáticamente al dar F5 o salir de la página.
  const [enviados, setEnviados] = useState([]);

  useEffect(() => {
    fetchMorosos();
  }, []);

  const fetchMorosos = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      const res = await api.get('/admin/clientes', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const todosLosClientes = res.data;

      const morosos = todosLosClientes.map(cliente => {
        const facturas = cliente?.servicios?.flatMap(s => s.facturas) || [];
        const facturasPendientes = facturas.filter(f => !f.pagada);
        
        if (facturasPendientes.length > 0) {
          const montoDeuda = facturasPendientes.reduce((acc, f) => acc + Number(f.monto || 0), 0);
          
          const fechas = facturasPendientes
            .map(f => new Date(f.vencimiento))
            .sort((a, b) => a - b);
          const fechaCorte = fechas[0];
          
          const numeroLimpio = cliente.telefono ? String(cliente.telefono).replace(/\D/g, '') : '';
          const tieneTelefonoValido = numeroLimpio.length > 0;
          
          return {
            ...cliente,
            deudaTotal: montoDeuda.toFixed(2),
            fechaCorte: fechaCorte ? fechaCorte.toLocaleDateString() : 'Sin fecha',
            facturasPendientes: facturasPendientes.length,
            tieneTelefono: tieneTelefonoValido
          };
        }
        return null;
      }).filter(Boolean);

      setClientesMorosos(morosos);
    } catch (error) {
      console.error("Error al cargar clientes para cobranza:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🧹 FUNCIÓN PARA REINICIAR MANUALMENTE
  const limpiarHistorialEnviados = () => {
    if (window.confirm("¿Deseas restablecer los botones de envío para empezar una nueva jornada?")) {
      setEnviados([]); 
    }
  };

  // 🟢 ENVÍO INDIVIDUAL (Vía Backend Twilio)
  const enviarWhatsAppIndividual = async (cliente) => {
    if (!cliente.tieneTelefono) return;

    try {
      const token = localStorage.getItem('token');
      
      await api.post('/admin/cobranza/enviar-individual', { clienteId: cliente.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEnviados(prev => prev.includes(cliente.id) ? prev : [...prev, cliente.id]);
      alert(`Aviso enviado con éxito a ${cliente.nombre}`);
    } catch (error) {
      console.error("Error en envío individual Twilio:", error);
      alert("Error al conectar con el servidor de mensajería.");
    }
  };

  // Filtrado por grupo
  const clientesFiltrados = filtroGrupo === 'TODOS' 
    ? clientesMorosos 
    : clientesMorosos.filter(c => String(c.diaCobro) === filtroGrupo);

  // 🟢 ENVÍO MASIVO (Vía Backend Twilio)
  const ejecutarEnvioMasivoBackend = async () => {
    const pendientes = clientesFiltrados.filter(c => c.tieneTelefono && !enviados.includes(c.id));

    if (pendientes.length === 0) {
      alert("No hay clientes pendientes con número telefónico en este bloque.");
      return;
    }

    const confirmar = window.confirm(
      `Estás por enviar avisos automáticos vía Twilio a ${pendientes.length} clientes.\n\nEste proceso se ejecutará en segundo plano. ¿Deseas iniciar?`
    );

    if (!confirmar) return;

    setEnviandoMasivo(true);

    try {
      const token = localStorage.getItem('token');
      const listaIds = pendientes.map(c => c.id);

      await api.post('/admin/cobranza/enviar-masivo', { clientesIds: listaIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEnviados(prev => [...new Set([...prev, ...listaIds])]);
      alert(`¡Lote de ${pendientes.length} mensajes enviado a cola de procesamiento exitosamente!`);
    } catch (error) {
      console.error("Error en cola masiva Twilio:", error);
      alert("Ocurrió un error al procesar el lote masivo en el servidor.");
    } finally {
      setEnviandoMasivo(false);
    }
  };

  const gruposDisponibles = [...new Set(clientesMorosos.map(c => String(c.diaCobro)))].sort();

  if (loading) return <div className="p-20 text-center font-black text-slate-500 uppercase tracking-widest">Cargando Gestor...</div>;

  const conteoPendientesMasivo = clientesFiltrados.filter(c => c.tieneTelefono && !enviados.includes(c.id)).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center px-8 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-[10px] font-black px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all uppercase">
            ⬅ Volver al Panel
          </button>
          <span className="text-[10px] font-black tracking-[0.3em] text-orange-400 border-l border-slate-700 pl-4 uppercase">Gestor de Cobranza (Twilio)</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto mt-8 px-4 space-y-8">
        
        {/* CABECERA Y FILTROS */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-black text-slate-800 uppercase mb-2">Cobranza Activa</h1>
            <p className="text-sm font-bold text-slate-500">
              Tienes <span className="text-red-500 font-black">{clientesMorosos.length} clientes</span> con adeudo total detectado.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full md:w-auto">
            
            {/* 🟢 NUEVO BOTÓN: Reiniciar Vista Manualmente */}
            {enviados.length > 0 && (
              <button
                onClick={limpiarHistorialEnviados}
                disabled={enviandoMasivo}
                className="w-full sm:w-auto px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border border-slate-200"
              >
                Reiniciar Vista 🔄
              </button>
            )}

            <div className="flex flex-col w-full sm:w-auto">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 ml-2">Filtrar por Día/Grupo</label>
              <select 
                value={filtroGrupo} 
                onChange={(e) => setFiltroGrupo(e.target.value)}
                disabled={enviandoMasivo}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 uppercase min-w-[180px]"
              >
                <option value="TODOS">Todos los grupos</option>
                {gruposDisponibles.map(grupo => (
                  <option key={grupo} value={grupo}>Grupo {grupo}</option>
                ))}
              </select>
            </div>

            {/* BOTÓN MASIVO */}
            <button
              onClick={ejecutarEnvioMasivoBackend}
              disabled={conteoPendientesMasivo === 0 || enviandoMasivo}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md self-end ${
                enviandoMasivo
                  ? 'bg-amber-100 text-amber-600 cursor-wait animate-pulse'
                  : conteoPendientesMasivo === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-orange-100'
              }`}
            >
              {enviandoMasivo ? 'Procesando Lote... ⏳' : `Enviar Bloque (${conteoPendientesMasivo}) 🚀`}
            </button>
          </div>
        </div>

        {/* LISTA DE MOROSOS */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          {clientesFiltrados.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {clientesFiltrados.map((cliente) => {
                const yaEnviado = enviados.includes(cliente.id);
                
                return (
                  <div key={cliente.id} className={`p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${!cliente.tieneTelefono ? 'bg-red-50/30' : yaEnviado ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black text-slate-800 uppercase">{cliente.nombre}</h3>
                        {yaEnviado && cliente.tieneTelefono && (
                          <span className="px-2 py-1 bg-green-100 text-green-600 rounded-md text-[8px] font-black uppercase tracking-widest">En cola de envío ✔</span>
                        )}
                        {!cliente.tieneTelefono && (
                          <span className="px-2 py-1 bg-red-100 text-red-600 rounded-md text-[8px] font-black uppercase tracking-widest">Sin Teléfono ⚠️</span>
                        )}
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
                        onClick={() => enviarWhatsAppIndividual(cliente)}
                        disabled={!cliente.tieneTelefono || enviandoMasivo}
                        className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                          !cliente.tieneTelefono
                            ? 'bg-red-100 text-red-400 cursor-not-allowed border border-red-200'
                            : yaEnviado 
                              ? 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200' 
                              : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200'
                        }`}
                      >
                        {!cliente.tieneTelefono 
                          ? 'Incompleto ❌' 
                          : yaEnviado 
                            ? 'Reenviar 💬' 
                            : 'Enviar Aviso 🔔'}
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