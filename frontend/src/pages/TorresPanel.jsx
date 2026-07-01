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

        <div className={vista !== 'gestion'   ? 'hidden' : ''}><VistaGestion /></div>
        <div className={vista !== 'monitoreo' ? 'hidden' : ''}><VistaMonitoreo /></div>
        <div className={vista !== 'mikrotik'  ? 'hidden' : ''}><VistaMikrotik /></div>
      </div>
    </div>
  );
};

// ── Vista: Gestión de Torres ──────────────────────────────────────────────────

const VistaGestion = () => {
  const [torres,      setTorres]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [editMode,    setEditMode]    = useState(false);
  const [torreId,     setTorreId]     = useState(null);
  const [nombre,      setNombre]      = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ipPrincipal, setIpPrincipal] = useState('');
  const [latitud,     setLatitud]     = useState('');
  const [longitud,    setLongitud]    = useState('');
  const [status,      setStatus]      = useState({ msg: '', type: '' });
  const [expandida,   setExpandida]   = useState(null);

  // Modal antena
  const [antenaModal,    setAntenaModal]    = useState(false);
  const [antenaEditando, setAntenaEditando] = useState(null);
  const [antenaTorreId,  setAntenaTorreId]  = useState(null);
  const [formAntena,     setFormAntena]     = useState({ nombre: '', descripcion: '', ipGateway: '', subred: '', interfaceName: '' });
  const [statusAntena,   setStatusAntena]   = useState({ msg: '', type: '' });

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
    setNombre(t.nombre);
    setDescripcion(t.descripcion || '');
    setIpPrincipal(t.ipPrincipal || '');
    setLatitud(t.latitud || '');
    setLongitud(t.longitud || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelar = () => {
    setEditMode(false); setTorreId(null);
    setNombre(''); setDescripcion(''); setIpPrincipal('');
    setLatitud(''); setLongitud('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        nombre,
        descripcion: descripcion || null,
        ipPrincipal: ipPrincipal || null,
        latitud:  latitud  ? parseFloat(latitud)  : null,
        longitud: longitud ? parseFloat(longitud) : null,
      };
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

  const abrirNuevaAntena = (tid) => {
    setAntenaTorreId(tid); setAntenaEditando(null);
    setFormAntena({ nombre: '', descripcion: '', ipGateway: '', subred: '', interfaceName: '' });
    setStatusAntena({ msg: '', type: '' });
    setAntenaModal(true);
  };

  const abrirEditarAntena = (tid, ant) => {
    setAntenaTorreId(tid); setAntenaEditando(ant);
    setFormAntena({
      nombre:        ant.nombre        || '',
      descripcion:   ant.descripcion   || '',
      ipGateway:     ant.ipGateway     || '',
      subred:        ant.subred        || '',
      interfaceName: ant.interfaceName || '',
    });
    setStatusAntena({ msg: '', type: '' });
    setAntenaModal(true);
  };

  const guardarAntena = async (e) => {
    e.preventDefault();
    try {
      if (antenaEditando) {
        await api.put(`/admin/antenas/${antenaEditando.id}`, formAntena, { headers: authHeader() });
      } else {
        await api.post('/admin/antenas', { ...formAntena, torreId: antenaTorreId }, { headers: authHeader() });
      }
      setAntenaModal(false);
      cargar();
    } catch (err) {
      setStatusAntena({ msg: err.response?.data?.error || 'Error al guardar', type: 'error' });
    }
  };

  const eliminarAntena = async (antId) => {
    if (!window.confirm('¿Eliminar esta antena? Se desvinculará de todos sus servicios.')) return;
    try {
      await api.delete(`/admin/antenas/${antId}`, { headers: authHeader() });
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  if (loading) return <div className="text-center text-slate-400 py-20 font-black uppercase text-xs tracking-widest">Cargando...</div>;

  return (
    <>
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

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Nombre de la zona *</label>
              <input required type="text" placeholder="Ej: VillaItzcali, Primaveras" value={nombre}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold"
                onChange={e => setNombre(e.target.value)} />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">IP Principal (gateway)</label>
              <input type="text" placeholder="Ej: 20.7.0.30" value={ipPrincipal}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold font-mono"
                onChange={e => setIpPrincipal(e.target.value)} />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Descripción</label>
              <input type="text" placeholder="Ej: Sector norte, fibra óptica" value={descripcion}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm"
                onChange={e => setDescripcion(e.target.value)} />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Coordenadas GPS</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="any" placeholder="Latitud" value={latitud}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold"
                  onChange={e => setLatitud(e.target.value)} />
                <input type="number" step="any" placeholder="Longitud" value={longitud}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold"
                  onChange={e => setLongitud(e.target.value)} />
              </div>
            </div>

            <button type="submit"
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase text-white ${editMode ? 'bg-blue-600' : 'bg-slate-900'}`}>
              {editMode ? 'Guardar Cambios' : 'Registrar Torre'}
            </button>
            {editMode && (
              <button type="button" onClick={cancelar}
                className="w-full text-slate-400 text-[10px] font-black uppercase hover:text-slate-600">
                Cancelar edición
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
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                  {torre.antenas?.length || 0} antenas · {torre.antenas?.reduce((s, a) => s + a.clientesConectados, 0) || 0} clientes
                </span>
                <button onClick={() => abrirNuevaAntena(torre.id)}
                  className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all text-xs font-black">
                  + Antena
                </button>
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
                  <div className="p-6 flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-black uppercase">Sin antenas registradas</span>
                    <button onClick={() => abrirNuevaAntena(torre.id)}
                      className="text-xs font-black text-emerald-600 hover:underline">
                      + Agregar primera antena
                    </button>
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
                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                          {antena.ipGateway && <span>GW: {antena.ipGateway}</span>}
                          {antena.subred    && <span>Red: {antena.subred}</span>}
                          <span className="font-black text-slate-600">{antena.clientesConectados} clientes</span>
                          <button onClick={() => abrirEditarAntena(torre.id, antena)}
                            className="ml-2 px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-black text-slate-500 transition-all">
                            Editar
                          </button>
                          <button onClick={() => eliminarAntena(antena.id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-lg font-black text-slate-400 transition-all">
                            ✕
                          </button>
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
    {/* ── Modal antena ──────────────────────────────────────────── */}
    {antenaModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8">
          <h2 className="text-xl font-black text-slate-800 mb-6">
            {antenaEditando ? 'Editar Antena' : 'Nueva Antena'}
          </h2>

          {statusAntena.msg && (
            <div className={`mb-4 p-3 rounded-2xl text-xs font-bold text-center ${statusAntena.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {statusAntena.msg}
            </div>
          )}

          <form onSubmit={guardarAntena} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Nombre *</label>
              <input required type="text" placeholder="Ej: VillaItzcali-Norte"
                value={formAntena.nombre}
                onChange={e => setFormAntena(f => ({ ...f, nombre: e.target.value }))}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">IP Gateway</label>
                <input type="text" placeholder="Ej: 10.150.1.1"
                  value={formAntena.ipGateway}
                  onChange={e => setFormAntena(f => ({ ...f, ipGateway: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Subred</label>
                <input type="text" placeholder="Ej: 10.150.1.0/24"
                  value={formAntena.subred}
                  onChange={e => setFormAntena(f => ({ ...f, subred: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono font-bold" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Interfaz MikroTik (opcional)</label>
              <input type="text" placeholder="Ej: dhcp-VillaItzcali, ether5-Primaveras"
                value={formAntena.interfaceName}
                onChange={e => setFormAntena(f => ({ ...f, interfaceName: e.target.value }))}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono" />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Descripción (opcional)</label>
              <input type="text" placeholder="Ej: Sector norte, 30 clientes fibra"
                value={formAntena.descripcion}
                onChange={e => setFormAntena(f => ({ ...f, descripcion: e.target.value }))}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit"
                className="flex-1 py-4 rounded-2xl font-black text-sm uppercase text-white bg-slate-900">
                {antenaEditando ? 'Guardar Cambios' : 'Crear Antena'}
              </button>
              <button type="button" onClick={() => setAntenaModal(false)}
                className="px-6 py-4 rounded-2xl font-black text-sm text-slate-400 bg-slate-100 hover:bg-slate-200 transition-all">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
};

// ── Vista: Conexiones en Vivo (DHCP) ─────────────────────────────────────────

const VistaMonitoreo = () => {
  const [leases,    setLeases]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [ultimaSync, setUltimaSync] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/mikrotik/leases-dhcp', { headers: authHeader() });
      setLeases(r.data);
      setUltimaSync(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const vinculados   = leases.filter(l => l.vinculado);
  const noVinculados = leases.filter(l => !l.vinculado);

  const badgeLease = (estado) =>
    estado === 'bound'   ? 'bg-green-100 text-green-700' :
    estado === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                           'bg-slate-100 text-slate-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="font-black text-slate-800 text-xl">Leases DHCP Activos</h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            {leases.length} leases · {vinculados.length} vinculados · {noVinculados.length} sin vincular
            {ultimaSync && <span className="ml-3 text-slate-300">Actualizado: {ultimaSync.toLocaleTimeString()}</span>}
          </p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-blue-700 transition-all disabled:opacity-50">
          {loading ? '⏳ Cargando...' : '🔄 Actualizar'}
        </button>
      </div>

      {loading && leases.length === 0 && (
        <div className="text-center py-20 text-slate-400 font-black text-xs uppercase">Consultando MikroTik...</div>
      )}

      {!loading && leases.length === 0 && (
        <div className="bg-white rounded-[2rem] p-20 text-center text-slate-400 font-black text-xs uppercase border border-slate-100">
          Sin leases DHCP detectados
        </div>
      )}

      {/* Leases vinculados a clientes */}
      {!loading && vinculados.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-green-50">
            <p className="font-black text-green-700 text-xs uppercase tracking-widest">✅ Vinculados a clientes ({vinculados.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50">
                  <th className="text-left p-4">MAC</th>
                  <th className="text-left p-4">IP Actual</th>
                  <th className="text-left p-4">Hostname</th>
                  <th className="text-left p-4">Cliente</th>
                  <th className="text-left p-4">Plan</th>
                  <th className="text-left p-4">Antena</th>
                  <th className="text-left p-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vinculados.map((l, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-bold text-blue-600 text-[11px]">{l.mac}</td>
                    <td className="p-4 font-mono text-slate-600">{l.ip || '—'}</td>
                    <td className="p-4 text-slate-500">{l.hostname || '—'}</td>
                    <td className="p-4 font-bold text-slate-700">
                      {l.cliente}
                      {l.numCliente && <span className="text-slate-400 font-normal ml-1">({l.numCliente})</span>}
                    </td>
                    <td className="p-4 text-slate-500">{l.plan || '—'}</td>
                    <td className="p-4 text-slate-500">{l.antena || <span className="text-orange-400">Sin antena</span>}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${badgeLease(l.estado)}`}>{l.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leases sin vincular */}
      {!loading && noVinculados.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-orange-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-orange-100 bg-orange-50">
            <p className="font-black text-orange-600 text-xs uppercase tracking-widest">
              ⚠️ Sin vincular ({noVinculados.length}) — importa desde MikroTik y asígnalos a clientes
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase border-b border-slate-100 bg-slate-50">
                  <th className="text-left p-4">MAC</th>
                  <th className="text-left p-4">IP Actual</th>
                  <th className="text-left p-4">Hostname</th>
                  <th className="text-left p-4">Servidor DHCP</th>
                  <th className="text-left p-4">Comentario</th>
                  <th className="text-left p-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {noVinculados.map((l, i) => (
                  <tr key={i} className="hover:bg-orange-50/30">
                    <td className="p-4 font-mono font-bold text-orange-600 text-[11px]">{l.mac}</td>
                    <td className="p-4 font-mono text-slate-600">{l.ip || '—'}</td>
                    <td className="p-4 text-slate-500">{l.hostname || '—'}</td>
                    <td className="p-4 font-mono text-slate-400">{l.servidor || '—'}</td>
                    <td className="p-4 text-slate-500">{l.comentario || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${badgeLease(l.estado)}`}>{l.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Vista: Importar desde MikroTik ───────────────────────────────────────────

const VistaMikrotik = () => {
  const [interfaces,      setInterfaces]      = useState([]);
  const [torres,          setTorres]          = useState([]);
  const [seleccionadas,   setSeleccionadas]   = useState([]);
  const [torreDestino,    setTorreDestino]    = useState('');
  const [loadingIface,    setLoadingIface]    = useState(false);
  const [loadingImport,   setLoadingImport]   = useState(false);
  const [loadingVincular, setLoadingVincular] = useState(false);
  const [loadingSync,     setLoadingSync]     = useState(false);
  const [loadingCrear,    setLoadingCrear]    = useState(false);
  const [loadingIwisp,    setLoadingIwisp]    = useState(false);
  const [resultado,       setResultado]       = useState(null);
  const [resultadoAnt,    setResultadoAnt]    = useState(null);
  const [resultadoVinc,   setResultadoVinc]   = useState(null);
  const [resultadoSync,   setResultadoSync]   = useState(null);
  const [resultadoCrear,  setResultadoCrear]  = useState(null);
  const [resultadoIwisp,  setResultadoIwisp]  = useState(null);
  const [paquetes,        setPaquetes]        = useState([]);
  const [paqueteDefault,  setPaqueteDefault]  = useState('');

  useEffect(() => {
    api.get('/torres', { headers: authHeader() })
       .then(r => setTorres(r.data)).catch(() => {});
    api.get('/paquetes', { headers: authHeader() })
       .then(r => setPaquetes(r.data)).catch(() => {});
  }, []);

  const sincronizarIPs = async () => {
    setLoadingSync(true); setResultadoSync(null);
    try {
      const r = await api.put('/admin/torres/sync-mikrotik', {}, { headers: authHeader() });
      setResultadoSync(r.data);
    } catch (e) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoadingSync(false);
    }
  };

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
      const r = await api.post('/importar/clientes-mikrotik', {}, { headers: authHeader() });
      setResultado(r.data);
    } catch (e) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoadingImport(false);
    }
  };

  const importarIwisp = async () => {
    setLoadingIwisp(true); setResultadoIwisp(null);
    try {
      const body = paqueteDefault ? { paqueteId: paqueteDefault } : {};
      const r = await api.post('/importar/iwisp', body, { headers: authHeader() });
      setResultadoIwisp(r.data);
    } catch (e) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoadingIwisp(false);
    }
  };

  const crearClientesDesdedhcp = async () => {
    if (!paqueteDefault) return alert('Selecciona un paquete por defecto');
    setLoadingCrear(true); setResultadoCrear(null);
    try {
      const r = await api.post('/importar/crear-clientes', { paqueteId: paqueteDefault }, { headers: authHeader() });
      setResultadoCrear(r.data);
    } catch (e) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoadingCrear(false);
    }
  };

  const vincularAutomatico = async () => {
    setLoadingVincular(true); setResultadoVinc(null);
    try {
      const r = await api.post('/importar/vincular-automatico', {}, { headers: authHeader() });
      setResultadoVinc(r.data);
    } catch (e) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoadingVincular(false);
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
          {/* Sincronizar IPs de torres existentes */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl">
            <div className="flex-1">
              <p className="text-xs font-black text-blue-700">Actualizar IPs de Torres existentes</p>
              <p className="text-[10px] text-blue-500 mt-0.5">Cruza las interfaces del MikroTik con las Torres registradas por nombre y actualiza su IP principal automáticamente.</p>
            </div>
            <button onClick={sincronizarIPs} disabled={loadingSync}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase hover:bg-blue-700 disabled:opacity-50 transition-all whitespace-nowrap">
              {loadingSync ? '⏳ Sincronizando...' : '🔄 Sync IPs'}
            </button>
          </div>

          {resultadoSync && (
            <div className="bg-white border border-slate-100 rounded-2xl p-4 text-xs space-y-2">
              <p className="font-black text-slate-700">
                ✅ {resultadoSync.actualizadas?.length || 0} torres actualizadas
                {resultadoSync.sinCoincidencia?.length > 0 && (
                  <span className="text-orange-500 ml-2">· {resultadoSync.sinCoincidencia.length} sin coincidencia</span>
                )}
              </p>
              {resultadoSync.actualizadas?.map((r, i) => (
                <div key={i} className="flex gap-2 text-[10px] text-slate-500">
                  <span className="font-bold text-green-600">{r.torre}</span>
                  <span>→</span>
                  <span className="font-mono text-blue-600">{r.ip}</span>
                  <span className="text-slate-300">({r.interface})</span>
                </div>
              ))}
              {resultadoSync.sinCoincidencia?.map((r, i) => (
                <div key={i} className="text-[10px] text-orange-500">
                  Sin torre para: <span className="font-mono">{r.interface}</span> (zona: {r.zona})
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Explorar interfaces del MikroTik</p>
            <button onClick={descubrirInterfaces} disabled={loadingIface}
              className="px-6 py-3 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase hover:bg-slate-700 disabled:opacity-50 transition-all">
              {loadingIface ? '⏳ Consultando MikroTik...' : '🔍 Descubrir Interfaces'}
            </button>
          </div>

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

      {/* SECCIÓN 2: Importar Leases DHCP */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-base uppercase tracking-wide">
            👥 Paso 2 — Importar Clientes DHCP desde MikroTik
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Lee los leases DHCP del router y los guarda en la base de datos usando la
            <span className="font-black text-slate-600"> MAC address</span> como identificador estable.
            Si el cliente cambia de IP, el servicio se actualiza automáticamente.
          </p>
        </div>

        <div className="p-6">
          <button onClick={importarClientes} disabled={loadingImport}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-slate-700 disabled:opacity-50 transition-all">
            {loadingImport ? '⏳ Procesando...' : '📥 Importar Leases DHCP'}
          </button>

          {resultado && (
            <div className="mt-4 bg-slate-50 rounded-2xl p-5 text-xs space-y-2">
              <p className="font-black text-slate-700 uppercase">{resultado.msg || 'Importación completada'}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {[
                  { label: 'Total leases',  val: resultado.resultado?.total,       color: 'text-slate-700' },
                  { label: 'Importados',    val: resultado.resultado?.importados,   color: 'text-blue-600'  },
                  { label: 'Actualizados',  val: resultado.resultado?.actualizados, color: 'text-green-600' },
                  { label: 'Errores',       val: resultado.resultado?.errores,      color: 'text-red-500'   },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className={`text-2xl font-black ${item.color}`}>{item.val ?? 0}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Ve a <span className="font-black text-slate-600">Conexiones en Vivo</span> para ver los leases importados y vincularlos a clientes.
              </p>
            </div>
          )}
        </div>
      </div>
      {/* SECCIÓN 3: Crear Clientes desde DHCP */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-base uppercase tracking-wide">
            👤 Paso 3 — Crear Clientes desde Leases DHCP
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Lee el comentario de cada lease (<span className="font-mono bg-slate-100 px-1 rounded">17 - Carrera Ambriz Elizabeth</span>),
            crea el <span className="font-black text-slate-600">Usuario + Cliente + Servicio</span> automáticamente.
            Si el cliente ya existe, solo vincula su MAC. Selecciona el paquete que se asignará a todos los clientes nuevos.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
              Paquete por defecto para clientes nuevos *
            </label>
            <select value={paqueteDefault} onChange={e => setPaqueteDefault(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700">
              <option value="">-- Selecciona un paquete --</option>
              {paquetes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} — {p.velocidad} Mbps — ${p.precio}</option>
              ))}
            </select>
          </div>

          <button onClick={crearClientesDesdedhcp} disabled={loadingCrear || !paqueteDefault}
            className="px-6 py-3 bg-green-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-green-700 disabled:opacity-50 transition-all">
            {loadingCrear ? '⏳ Creando clientes...' : '👤 Crear Clientes desde DHCP'}
          </button>

          {resultadoCrear && (
            <div className="bg-slate-50 rounded-2xl p-5 text-xs space-y-3">
              <p className="font-black text-slate-700 uppercase">{resultadoCrear.msg}</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Con número',  val: resultadoCrear.resultado?.creados,    color: 'text-green-600'  },
                  { label: 'Sin número*', val: resultadoCrear.resultado?.temporales, color: 'text-yellow-600' },
                  { label: 'Vinculados',  val: resultadoCrear.resultado?.vinculados, color: 'text-blue-600'   },
                  { label: 'Omitidos',    val: resultadoCrear.resultado?.omitidos,   color: 'text-orange-500' },
                  { label: 'Errores',     val: resultadoCrear.resultado?.errores,    color: 'text-red-500'    },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className={`text-2xl font-black ${item.color}`}>{item.val ?? 0}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>

              {(resultadoCrear.resultado?.temporales ?? 0) > 0 && (
                <p className="text-[10px] text-yellow-600 bg-yellow-50 px-3 py-2 rounded-xl">
                  * Los clientes "Sin número" se crearon con ID temporal <span className="font-mono">DHCP-XXXXXX</span> — busca sus registros en el panel de clientes y asígnales el número correcto.
                </p>
              )}

              {resultadoCrear.resultado?.problemas?.length > 0 && (
                <div>
                  <p className="font-black text-orange-600 text-[10px] uppercase mb-2">
                    Problemas ({resultadoCrear.resultado.problemas.length}):
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {resultadoCrear.resultado.problemas.map((p, i) => (
                      <div key={i} className="flex gap-3 text-[10px] bg-orange-50 px-3 py-1.5 rounded-lg">
                        <span className="font-mono font-bold text-orange-700 shrink-0">{p.mac}</span>
                        <span className="text-slate-500 truncate flex-1">{p.comentario || '—'}</span>
                        <span className="text-orange-600 shrink-0">{p.razon}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 4: Importar desde IWisp */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-base uppercase tracking-wide">
            📊 Paso 4 — Completar datos desde IWisp
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Lee el archivo <span className="font-mono bg-slate-100 px-1 rounded">IWM_clientes_20260608.xlsx</span> del servidor.
            Clientes existentes se <span className="font-black text-slate-600">actualizan</span> (email, teléfono, dirección, plan, torre).
            Clientes nuevos se <span className="font-black text-slate-600">crean</span>.
            El paquete por defecto se usa solo si el plan de IWisp no existe en el sistema.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
              Paquete de respaldo (si no se encuentra el plan de IWisp)
            </label>
            <select value={paqueteDefault} onChange={e => setPaqueteDefault(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700">
              <option value="">-- Sin respaldo (omitir si no hay match) --</option>
              {paquetes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} — {p.velocidad} Mbps — ${p.precio}</option>
              ))}
            </select>
          </div>

          <button onClick={importarIwisp} disabled={loadingIwisp}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 disabled:opacity-50 transition-all">
            {loadingIwisp ? '⏳ Importando IWisp... (puede tardar)' : '📊 Importar desde IWisp'}
          </button>

          {resultadoIwisp && (
            <div className="bg-slate-50 rounded-2xl p-5 text-xs space-y-3">
              <p className="font-black text-slate-700 uppercase">{resultadoIwisp.msg}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total',        val: resultadoIwisp.resultado?.total,        color: 'text-slate-700' },
                  { label: 'Creados',      val: resultadoIwisp.resultado?.creados,      color: 'text-green-600' },
                  { label: 'Actualizados', val: resultadoIwisp.resultado?.actualizados, color: 'text-blue-600'  },
                  { label: 'Errores',      val: resultadoIwisp.resultado?.errores,      color: 'text-red-500'   },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className={`text-2xl font-black ${item.color}`}>{item.val ?? 0}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>

              {resultadoIwisp.resultado?.sinPlan?.length > 0 && (
                <div className="bg-yellow-50 rounded-xl p-3">
                  <p className="font-black text-yellow-700 text-[10px] uppercase mb-1">Planes sin coincidencia en el sistema:</p>
                  <div className="flex flex-wrap gap-1">
                    {resultadoIwisp.resultado.sinPlan.map((p, i) => (
                      <span key={i} className="font-mono bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-[10px]">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {resultadoIwisp.resultado?.sinTorre?.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="font-black text-orange-700 text-[10px] uppercase mb-1">Torres sin coincidencia en el sistema:</p>
                  <div className="flex flex-wrap gap-1">
                    {resultadoIwisp.resultado.sinTorre.map((t, i) => (
                      <span key={i} className="font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-[10px]">{t}</span>
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
