// src/pages/TorresPanel.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import logoCitynet from '../assets/logo-citynet-antiguo.png';

// ── Helpers ──────────────────────────────────────────────────────────────────

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const badge = (estado) =>
  estado === 'ACTIVO'
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-600';

// ── Componente principal ──────────────────────────────────────────────────────

const TorresPanel = () => {
  const navigate = useNavigate();
  const [vista, setVista] = useState('gestion'); // 'gestion' | 'monitoreo' | 'mikrotik'

  useEffect(() => {
    const user  = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    if (!token || user?.rol !== 'ADMIN') navigate('/login');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">

      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center px-8 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <img src={logoCitynet} alt="Logo" className="h-8 brightness-0 invert" />
          <span className="text-[10px] font-black tracking-[0.3em] text-blue-400 border-l border-slate-700 pl-4 uppercase">
            Infraestructura de Red
          </span>
        </div>
        <Link to="/admin" className="text-[10px] font-black px-4 py-2 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white transition-all uppercase">
          ← Volver
        </Link>
      </nav>

      {/* TABS */}
      <div className="max-w-7xl mx-auto mt-8 px-4">
        <div className="flex gap-3 mb-8">
          {[
            { key: 'gestion',   label: '🗼 Torres y Antenas' },
            { key: 'monitoreo', label: '📡 Conexiones en Vivo' },
            { key: 'mikrotik',  label: '🔧 Importar de MikroTik' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setVista(t.key)}
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase transition-all ${
                vista === t.key
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {vista === 'gestion'   && <VistaGestion />}
        {vista === 'monitoreo' && <VistaMonitoreo />}
        {vista === 'mikrotik'  && <VistaMikrotik />}
      </div>
    </div>
  );
};

// ── Vista: Gestión de Torres ──────────────────────────────────────────────────

const VistaGestion = () => {
  const [torres,   setTorres]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [torreId,  setTorreId]  = useState(null);
  const [nombre,   setNombre]   = useState('');
  const [latitud,  setLatitud]  = useState('');
  const [longitud, setLongitud] = useState('');
  const [status,   setStatus]   = useState({ msg: '', type: '' });
  const [expandida, setExpandida] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const r = await api.get('/torres', { headers: authHeader() });
      setTorres(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const iniciarEdicion = (t) => {
    setEditMode(true); setTorreId(t.id);
    setNombre(t.nombre); setLatitud(t.latitud || ''); setLongitud(t.longitud || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelar = () => {
    setEditMode(false); setTorreId(null);
    setNombre(''); setLatitud(''); setLongitud('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { nombre, latitud: latitud ? parseFloat(latitud) : null, longitud: longitud ? parseFloat(longitud) : null };
      if (editMode) {
        await api.put(`/admin/torres/${torreId}`, data, { headers: authHeader() });
      } else {
        await api.post('/admin/torres', data, { headers: authHeader() });
      }
      setStatus({ msg: editMode ? 'Torre actualizada' : 'Torre registrada', type: 'success' });
      cancelar(); cargar();
      setTimeout(() => setStatus({ msg: '', type: '' }), 3000);
    } catch {
      setStatus({ msg: 'Error al procesar', type: 'error' });
    }
  };

  if (loading) return <div className="text-center text-slate-400 py-20 font-black uppercase text-xs tracking-widest">Cargando...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Formulario */}
      <div className="lg:col-span-4">
        <div className={`bg-white p-8 rounded-[2.5rem] shadow-sm border sticky top-24 ${editMode ? 'border-blue-200 ring-2 ring-blue-50' : 'border-slate-100'}`}>
          <h2 className="text-xl font-black text-slate-800 mb-6">{editMode ? 'Editar Torre' : 'Nueva Torre'}</h2>

          {status.msg && (
            <div className={`mb-4 p-3 rounded-2xl text-xs font-bold text-center ${status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {status.msg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input required type="text" placeholder="Nombre de la torre" value={nombre}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold"
              onChange={e => setNombre(e.target.value)} />

            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="any" placeholder="Latitud" value={latitud}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold"
                onChange={e => setLatitud(e.target.value)} />
              <input type="number" step="any" placeholder="Longitud" value={longitud}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold"
                onChange={e => setLongitud(e.target.value)} />
            </div>

            <button type="submit"
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase text-white ${editMode ? 'bg-blue-600' : 'bg-slate-900'}`}>
              {editMode ? 'Guardar Cambios' : 'Registrar Torre'}
            </button>
            {editMode && (
              <button type="button" onClick={cancelar}
                className="w-full text-slate-400 text-[10px] font-black uppercase hover:text-slate-600">
                Cancelar
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Lista con antenas expandibles */}
      <div className="lg:col-span-8 space-y-4">
        {torres.length === 0 && (
          <div className="bg-white rounded-[2.5rem] p-16 text-center text-slate-400 font-black text-xs uppercase tracking-widest border border-slate-100">
            Sin torres registradas. Crea una o usa la pestaña "Importar de MikroTik".
          </div>
        )}
        {torres.map(torre => (
          <div key={torre.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            {/* Header torre */}
            <div className="p-6 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🗼</span>
                  <div>
                    <p className="font-black text-slate-800 text-lg">{torre.nombre}</p>
                    <div className="flex gap-3 mt-0.5">
                      {torre.ipPrincipal && (
                        <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">{torre.ipPrincipal}</span>
                      )}
                      {torre.latitud ? (
                        <span className="text-[10px] font-mono text-slate-400">{torre.latitud}, {torre.longitud}</span>
                      ) : (
                        <span className="text-[10px] font-bold text-orange-400 bg-orange-50 px-2 py-0.5 rounded-md">Sin GPS</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                  {torre.antenas?.length || 0} antenas · {torre.antenas?.reduce((s, a) => s + a.clientesConectados, 0) || 0} clientes
                </span>
                <button onClick={() => iniciarEdicion(torre)}
                  className="p-2.5 bg-slate-100 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all text-slate-500 text-xs font-black">
                  Editar
                </button>
                <button onClick={() => setExpandida(expandida === torre.id ? null : torre.id)}
                  className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all text-slate-600 font-black text-xs">
                  {expandida === torre.id ? '▲' : '▼'}
                </button>
              </div>
            </div>

            {/* Antenas */}
            {expandida === torre.id && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {(!torre.antenas || torre.antenas.length === 0) ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-black uppercase">
                    Sin antenas — usa "Importar de MikroTik" para auto-detectarlas
                  </div>
                ) : (
                  torre.antenas.map(antena => (
                    <div key={antena.id} className="px-6 py-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${antena.activa ? 'bg-green-400' : 'bg-red-400'}`} />
                          <span className="font-black text-slate-700 text-sm">📡 {antena.nombre}</span>
                          {antena.interfaceName && (
                            <span className="text-[10px] font-mono text-blue-500 bg-blue-50 px-2 py-0.5 rounded">{antena.interfaceName}</span>
                          )}
                        </div>
                        <div className="flex gap-3 text-[10px] font-mono text-slate-400">
                          {antena.ipGateway && <span>GW: {antena.ipGateway}</span>}
                          {antena.subred    && <span>Red: {antena.subred}</span>}
                          <span className="font-black text-slate-600">{antena.clientesConectados} clientes</span>
                        </div>
                      </div>
                      {antena.clientes?.length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <th className="text-left py-2 pr-4">Cliente</th>
                                <th className="text-left py-2 pr-4">Num.</th>
                                <th className="text-left py-2 pr-4">MikroTik User</th>
                                <th className="text-left py-2 pr-4">IP</th>
                                <th className="text-left py-2 pr-4">MAC</th>
                                <th className="text-left py-2 pr-4">Plan</th>
                                <th className="text-left py-2">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {antena.clientes.map(c => (
                                <tr key={c.servicioId} className="hover:bg-slate-50">
                                  <td className="py-2 pr-4 font-bold text-slate-700">{c.nombre}</td>
                                  <td className="py-2 pr-4 text-slate-500">{c.numCliente}</td>
                                  <td className="py-2 pr-4 font-mono text-blue-500">{c.mikrotikUser || <span className="text-slate-300">—</span>}</td>
                                  <td className="py-2 pr-4 font-mono text-slate-500">{c.ipAsignada}</td>
                                  <td className="py-2 pr-4 font-mono text-slate-400 text-[10px]">{c.macAddress || '—'}</td>
                                  <td className="py-2 pr-4 text-slate-500">{c.plan}</td>
                                  <td className="py-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${badge(c.estado)}`}>{c.estado}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Vista: Conexiones en Vivo ─────────────────────────────────────────────────

const VistaMonitoreo = () => {
  const [sesiones,  setSesiones]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [ultimaSync, setUltimaSync] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/mikrotik/sesiones-activas', { headers: authHeader() });
      setSesiones(r.data);
      setUltimaSync(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const vinculadas   = sesiones.filter(s => s.vinculado);
  const noVinculadas = sesiones.filter(s => !s.vinculado);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="font-black text-slate-800 text-xl">Sesiones PPPoE Activas</h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            {sesiones.length} sesiones · {vinculadas.length} vinculadas · {noVinculadas.length} sin vincular
            {ultimaSync && <span className="ml-3 text-slate-300">Actualizado: {ultimaSync.toLocaleTimeString()}</span>}
          </p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-blue-700 transition-all disabled:opacity-50">
          {loading ? '⏳ Cargando...' : '🔄 Actualizar'}
        </button>
      </div>

      {loading && <div className="text-center py-20 text-slate-400 font-black text-xs uppercase">Consultando MikroTik...</div>}

      {!loading && sesiones.length === 0 && (
        <div className="bg-white rounded-[2rem] p-20 text-center text-slate-400 font-black text-xs uppercase border border-slate-100">
          Sin sesiones activas detectadas
        </div>
      )}

      {/* Sesiones vinculadas */}
      {!loading && vinculadas.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-green-50">
            <p className="font-black text-green-700 text-xs uppercase tracking-widest">✅ Sesiones Vinculadas ({vinculadas.length})</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50">
                <th className="text-left p-4">PPPoE User</th>
                <th className="text-left p-4">Cliente</th>
                <th className="text-left p-4">IP Asignada</th>
                <th className="text-left p-4">MAC</th>
                <th className="text-left p-4">Interface</th>
                <th className="text-left p-4">Antena</th>
                <th className="text-left p-4">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {vinculadas.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-bold text-blue-600">{s.usuario}</td>
                  <td className="p-4 font-bold text-slate-700">{s.cliente} <span className="text-slate-400 font-normal">({s.numCliente})</span></td>
                  <td className="p-4 font-mono text-slate-600">{s.ip || '—'}</td>
                  <td className="p-4 font-mono text-slate-400 text-[10px]">{s.mac || '—'}</td>
                  <td className="p-4 font-mono text-slate-500">{s.interfaz || '—'}</td>
                  <td className="p-4 text-slate-500">{s.antena || <span className="text-orange-400">Sin antena</span>}</td>
                  <td className="p-4 text-slate-400">{s.uptime || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sesiones sin vincular */}
      {!loading && noVinculadas.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-orange-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-orange-100 bg-orange-50">
            <p className="font-black text-orange-600 text-xs uppercase tracking-widest">
              ⚠️ Sesiones sin vincular ({noVinculadas.length}) — usa "Importar de MikroTik" para vincularlas
            </p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase border-b border-slate-100 bg-slate-50">
                <th className="text-left p-4">PPPoE User</th>
                <th className="text-left p-4">IP</th>
                <th className="text-left p-4">MAC</th>
                <th className="text-left p-4">Interface</th>
                <th className="text-left p-4">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {noVinculadas.map((s, i) => (
                <tr key={i} className="hover:bg-orange-50/30">
                  <td className="p-4 font-mono font-bold text-orange-600">{s.usuario}</td>
                  <td className="p-4 font-mono text-slate-600">{s.ip || '—'}</td>
                  <td className="p-4 font-mono text-slate-400 text-[10px]">{s.mac || '—'}</td>
                  <td className="p-4 font-mono text-slate-500">{s.interfaz || '—'}</td>
                  <td className="p-4 text-slate-400">{s.uptime || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Vista: Importar desde MikroTik ───────────────────────────────────────────

const VistaMikrotik = () => {
  const [interfaces,    setInterfaces]    = useState([]);
  const [torres,        setTorres]        = useState([]);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [torreDestino,  setTorreDestino]  = useState('');
  const [loadingIface,  setLoadingIface]  = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [resultado,     setResultado]     = useState(null);
  const [resultadoAnt,  setResultadoAnt]  = useState(null);

  useEffect(() => {
    api.get('/admin/torres', { headers: authHeader() })
       .then(r => setTorres(r.data)).catch(() => {});
  }, []);

  const descubrirInterfaces = async () => {
    setLoadingIface(true); setInterfaces([]); setResultadoAnt(null);
    try {
      const r = await api.get('/admin/mikrotik/interfaces', { headers: authHeader() });
      setInterfaces(r.data);
    } catch (e) {
      alert('Error al conectar con MikroTik: ' + (e.response?.data?.detalle || e.message));
    } finally {
      setLoadingIface(false);
    }
  };

  const toggleSeleccion = (nombre) => {
    setSeleccionadas(prev =>
      prev.includes(nombre) ? prev.filter(n => n !== nombre) : [...prev, nombre]
    );
  };

  const crearAntenas = async () => {
    if (!torreDestino) return alert('Selecciona una torre destino');
    if (seleccionadas.length === 0) return alert('Selecciona al menos una interface');

    setLoadingImport(true);
    try {
      const payload = interfaces.filter(i => seleccionadas.includes(i.nombre));
      const r = await api.post('/admin/mikrotik/crear-antenas',
        { torreId: torreDestino, interfaces: payload },
        { headers: authHeader() }
      );
      setResultadoAnt(r.data);
      setSeleccionadas([]);
    } catch (e) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoadingImport(false);
    }
  };

  const importarClientes = async () => {
    setLoadingImport(true); setResultado(null);
    try {
      const r = await api.post('/admin/mikrotik/importar', {}, { headers: authHeader() });
      setResultado(r.data);
    } catch (e) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoadingImport(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">

      {/* SECCIÓN 1: Descubrir Antenas */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-base uppercase tracking-wide">
            📡 Paso 1 — Descubrir Antenas (Interfaces de MikroTik)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Extrae las interfaces del router (VLANs, bridges) con sus IPs y subredes, y las convierte en Antenas de una Torre.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <button onClick={descubrirInterfaces} disabled={loadingIface}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-blue-700 disabled:opacity-50 transition-all">
            {loadingIface ? '⏳ Consultando MikroTik...' : '🔍 Descubrir Interfaces'}
          </button>

          {interfaces.length > 0 && (
            <>
              <p className="text-xs font-black text-slate-500 uppercase">{interfaces.length} interfaces encontradas — selecciona las que son antenas de clientes:</p>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase">
                      <th className="p-3 text-left w-10">✓</th>
                      <th className="p-3 text-left">Interface</th>
                      <th className="p-3 text-left">Tipo</th>
                      <th className="p-3 text-left">Gateway</th>
                      <th className="p-3 text-left">Subred</th>
                      <th className="p-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {interfaces.map(i => (
                      <tr key={i.nombre}
                        onClick={() => toggleSeleccion(i.nombre)}
                        className={`cursor-pointer transition-all ${seleccionadas.includes(i.nombre) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <td className="p-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${seleccionadas.includes(i.nombre) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                            {seleccionadas.includes(i.nombre) && <span className="text-white text-[10px]">✓</span>}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">{i.nombre}</td>
                        <td className="p-3 text-slate-500">{i.tipo}</td>
                        <td className="p-3 font-mono text-blue-600">{i.ipGateway || '—'}</td>
                        <td className="p-3 font-mono text-slate-500">{i.subred || '—'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${i.activa ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                            {i.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {seleccionadas.length > 0 && (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-blue-600 uppercase mb-1 block">Torre destino</label>
                    <select value={torreDestino} onChange={e => setTorreDestino(e.target.value)}
                      className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm font-bold text-slate-700">
                      <option value="">-- Selecciona una Torre --</option>
                      {torres.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                  <button onClick={crearAntenas} disabled={loadingImport || !torreDestino}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-blue-700 disabled:opacity-50 transition-all whitespace-nowrap self-end">
                    {loadingImport ? '⏳ Creando...' : `Crear ${seleccionadas.length} Antenas`}
                  </button>
                </div>
              )}

              {resultadoAnt && (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-xs">
                  <p className="font-black text-green-700 mb-2">✅ Antenas procesadas</p>
                  <p>Creadas: <b>{resultadoAnt.creadas?.length || 0}</b> — Actualizadas: <b>{resultadoAnt.actualizadas?.length || 0}</b></p>
                  {resultadoAnt.errores?.length > 0 && (
                    <p className="text-red-500 mt-1">Errores: {resultadoAnt.errores.map(e => e.interface).join(', ')}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SECCIÓN 2: Vincular Clientes */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-base uppercase tracking-wide">
            👥 Paso 2 — Vincular Clientes desde MikroTik
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Lee los PPPoE secrets del router y los vincula automáticamente con los Servicios de la BD
            buscando coincidencias por <code className="bg-slate-100 px-1 rounded">numCliente</code>.
          </p>
        </div>

        <div className="p-6">
          <button onClick={importarClientes} disabled={loadingImport}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-slate-700 disabled:opacity-50 transition-all">
            {loadingImport ? '⏳ Procesando...' : '🔗 Vincular Clientes desde MikroTik'}
          </button>

          {resultado && (
            <div className="mt-4 bg-slate-50 rounded-2xl p-5 text-xs space-y-2">
              <p className="font-black text-slate-700 uppercase">{resultado.mensaje}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {[
                  { label: 'Total MikroTik', val: resultado.totalMikrotik, color: 'text-slate-700' },
                  { label: 'Ya vinculados',  val: resultado.yaVinculados,  color: 'text-green-600'  },
                  { label: 'Vinculados hoy', val: resultado.vinculados,    color: 'text-blue-600'   },
                  { label: 'Sin cliente',    val: resultado.sinCliente,    color: 'text-orange-500' },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className={`text-2xl font-black ${item.color}`}>{item.val ?? 0}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              {resultado.problemas?.length > 0 && (
                <div className="mt-3">
                  <p className="font-black text-orange-600 text-[10px] uppercase mb-2">Sin vincular:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {resultado.problemas.map((p, i) => (
                      <div key={i} className="flex justify-between text-[10px] text-slate-500 bg-orange-50 px-3 py-1.5 rounded-lg">
                        <span className="font-mono font-bold">{p.name}</span>
                        <span>{p.razon}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TorresPanel;
