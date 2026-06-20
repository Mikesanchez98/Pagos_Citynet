// src/components/MapaPinSelector.jsx
// Mapa interactivo para seleccionar coordenadas exactas.
// El geocodificador te deja cerca; este componente te deja en el punto exacto.
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pinIcon = L.divIcon({
  html: `<div style="
    background:#3b82f6;
    width:18px;height:18px;
    border-radius:50%;
    border:3px solid white;
    box-shadow:0 2px 10px rgba(59,130,246,0.6);
    cursor:grab;
  "></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Componente interno: escucha clicks en el mapa y reposiciona el marcador
const ClickHandler = ({ onChange }) => {
  useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) });
  return null;
};

// Componente interno: re-centra el mapa cuando cambian las coords por geocodificación
const Recentrar = ({ lat, lng, triggerKey }) => {
  const mapRef = useRef(null);
  const map = useMapEvents({});

  useEffect(() => {
    if (map && lat && lng) {
      map.flyTo([lat, lng], map.getZoom(), { animate: true, duration: 0.8 });
    }
  }, [triggerKey]); // solo cuando el geocodificador dispara, no al arrastrar

  return null;
};

/**
 * Props:
 *   lat, lng       — coordenadas actuales (number o string)
 *   onChange(lat, lng) — callback al mover el pin o hacer click
 *   triggerKey     — número que incrementa cuando el geocodificador asigna nuevas coords
 *                    (para re-centrar el mapa sin re-montarlo)
 */
const MapaPinSelector = ({ lat, lng, onChange, triggerKey = 0 }) => {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  // Si no hay coordenadas válidas, no mostramos el mapa
  if (!lat || !lng || isNaN(latNum) || isNaN(lngNum)) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-blue-100 shadow-sm">
      <div className="bg-blue-50 px-3 py-1.5 border-b border-blue-100">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
          📍 Haz clic en el mapa o arrastra el pin para ajustar la ubicación exacta
        </p>
      </div>
      <MapContainer
        center={[latNum, lngNum]}
        zoom={17}
        style={{ height: '220px', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <Recentrar lat={latNum} lng={lngNum} triggerKey={triggerKey} />
        <Marker
          position={[latNum, lngNum]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng();
              onChange(lat, lng);
            }
          }}
        />
      </MapContainer>
    </div>
  );
};

export default MapaPinSelector;
