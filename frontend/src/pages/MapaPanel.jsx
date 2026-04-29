// src/pages/MapaPanel.jsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import logoCitynet from '../assets/logo-citynet-antiguo.png';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- CONFIGURACIÓN DE ICONOS PERSONALIZADOS ---
const torreIcon = L.divIcon({
  html: `<div class="bg-slate-900 p-2 rounded-full border-2 border-blue-400 shadow-lg shadow-blue-500/50 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path>
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path>
            <circle cx="12" cy="12" r="2"></circle>
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path>
            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"></path>
            <path d="M12 14v8"></path>
          </svg>
        </div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const clienteIcon = L.divIcon({
  html: `<div class="bg-white p-1.5 rounded-full border-2 border-slate-300 shadow-md flex items-center justify-center hover:border-blue-500 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const MapaPanel = () => {
  const navigate = useNavigate();
  const [torres, setTorres] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarAcceso = () => {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      if (!token || user?.rol !== 'ADMIN') {
        navigate('/login');
        return;
      }
      cargarDatosMapa();
    };
    verificarAcceso();
  }, [navigate]);

  const cargarDatosMapa = async () => {
    try {
      const token = localStorage.getItem('token');
      const [resTorres, resClientes] = await Promise.all([
        axios.get('http://localhost:3001/api/admin/torres', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3001/api/admin/clientes', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setTorres(resTorres.data);
      setClientes(resClientes.data);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">Cargando Mapa...</div>;

  return (
    <div className="h-screen w-full flex flex-col font-sans overflow-hidden">
      
      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center px-8 z-[1000]">
        <div className="flex items-center gap-4">
          <img src={logoCitynet} alt="Logo" className="h-8 brightness-0 invert" />
          <span className="text-[10px] font-black tracking-[0.3em] text-blue-400 border-l border-slate-700 pl-4 uppercase">Monitoreo de Red</span>
        </div>
        <Link to="/admin" className="text-[10px] font-black px-4 py-2 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white transition-all uppercase">
          Regresar
        </Link>
      </nav>

      <div className="flex-1 relative">
        <MapContainer 
          center={[19.2435, -103.7250]} 
          zoom={14} 
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* DIBUJAR TORRES */}
          {torres.map(torre => (
            <React.Fragment key={`group-${torre.id}`}>
              <Marker position={[torre.latitud, torre.longitud]} icon={torreIcon}>
                <Popup>
                  <div className="p-1">
                    <h3 className="font-black text-slate-800 uppercase text-xs">🗼 {torre.nombre}</h3>
                    <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase">Torre Base</p>
                  </div>
                </Popup>
              </Marker>

              {/* DIBUJAR CLIENTES Y LÍNEAS DE CONEXIÓN */}
              {clientes
                .filter(c => c.torreId === torre.id && c.latitud && c.longitud)
                .map(cliente => (
                  <React.Fragment key={`cliente-flow-${cliente.id}`}>
                    {/* Línea de la torre al cliente */}
                    <Polyline 
                      positions={[
                        [torre.latitud, torre.longitud],
                        [cliente.latitud, cliente.longitud]
                      ]}
                      pathOptions={{ 
                        color: '#60a5fa', 
                        weight: 2, 
                        dashArray: '5, 10', 
                        opacity: 0.5 
                      }}
                    />
                    
                    {/* Marcador del Cliente */}
                    <Marker position={[cliente.latitud, cliente.longitud]} icon={clienteIcon}>
                      <Popup>
                        <div className="min-w-[120px]">
                          <p className="font-black text-slate-800 text-xs mb-1">{cliente.nombre}</p>
                          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">ID: {cliente.numCliente}</span>
                            <span className="text-[9px] font-black text-green-500 uppercase">En Línea</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-2 italic font-medium">Conectado a: {torre.nombre}</p>
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                ))}
            </React.Fragment>
          ))}

          {/* MOSTRAR CLIENTES QUE NO TIENEN TORRE ASIGNADA (PARA QUE NO SE PIERDAN) */}
          {clientes.filter(c => !c.torreId && c.latitud && c.longitud).map(cliente => (
            <Marker key={`orphan-${cliente.id}`} position={[cliente.latitud, cliente.longitud]} icon={clienteIcon}>
              <Popup>
                <div className="p-1">
                  <h3 className="font-black text-slate-800 text-xs">{cliente.nombre}</h3>
                  <span className="text-[9px] font-black text-orange-500 uppercase bg-orange-50 px-2 py-0.5 rounded-full">Sin Torre Asignada</span>
                </div>
              </Popup>
            </Marker>
          ))}

        </MapContainer>
      </div>
    </div>
  );
};

export default MapaPanel;