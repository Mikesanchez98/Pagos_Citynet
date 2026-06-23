// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoCitynet from '../assets/logo-citynet-antiguo.png'; 
import api from '../api/axios'; 
import SoporteCliente from '../pages/SoporteCliente'; 

const Dashboard = () => {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumen');
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await api.get('/cliente/perfil', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setDatos(response.data);
      } catch (error) {
        console.error('Error al cargar datos del cliente:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handlePagar = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('No se encontró tu sesión. Por favor, vuelve a iniciar sesión.');
        return;
      }

      // Si no hay servicios seleccionados, seleccionar todos
      const servicios = serviciosSeleccionados.length > 0
        ? serviciosSeleccionados
        : datos?.servicios?.map(s => s.id) || [];

      if (servicios.length === 0) {
        alert('No hay servicios para pagar.');
        return;
      }

      // Calcular monto total de servicios seleccionados
      const montoTotal = datos?.servicios
        ?.filter(s => servicios.includes(s.id))
        ?.reduce((sum, s) => sum + (s.paquete?.precio || 0), 0) || 0;

      if (montoTotal <= 0) {
        alert('El monto a pagar no es válido.');
        return;
      }

      const respuesta = await api.post('/pagos/crear-checkout', {
        servicios: servicios,
        monto: montoTotal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (respuesta.data && respuesta.data.url) {
        window.location.href = respuesta.data.url;
      }

    } catch (error) {
      console.error('Error al generar pago:', error);
      alert('Hubo un error al generar tu enlace de pago.');
    }
  };

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Cargando tu portal...</p>
        </div>
      </div>
    );
  }

  const fechaVencimientoFormateada = datos?.vencimiento 
    ? new Date(datos.vencimiento).toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'long'
      })
    : "Sin adeudos";

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      
      {/* Navbar Superior */}
      <nav className="bg-primary text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2">
            <img src={logoCitynet} alt="Logo Citynet" className="h-12 object-contain brightness-0 invert" />
        </div>
        <button 
            onClick={handleLogout}
            className="text-sm font-medium bg-blue-700/50 hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors border border-blue-400/30">
          Cerrar Sesión
        </button>
      </nav>

      {/* Contenedor Principal */}
      <div className="max-w-3xl mx-auto px-4 mt-8 space-y-6">
        
        {/* Saludo, ID de Cliente e Insignias Forzadas */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{obtenerSaludo()}, {datos?.nombre}</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Número de Cliente: <span className="text-primary font-bold">{datos?.numCliente}</span>
            </p>
          </div>

          {/* Insignias de información forzadas a mostrarse */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 bg-slate-200/50 text-slate-600 text-xs px-3 py-1.5 rounded-lg font-medium border border-slate-100">
              <span>📍</span> 
              <span className="truncate max-w-[200px] sm:max-w-md">
                {datos?.direccion ? datos.direccion : 'Dirección no disponible'}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 bg-slate-200/50 text-slate-600 text-xs px-3 py-1.5 rounded-lg font-medium border border-slate-100">
              <span>📱</span> 
              <span>{datos?.telefono ? datos.telefono : 'Teléfono no registrado'}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-200/50 text-slate-600 text-xs px-3 py-1.5 rounded-lg font-medium border border-slate-100">
              <span>📧</span> 
              <span className="truncate max-w-[150px]">
                {datos?.correo ? datos.correo : 'Correo no registrado'}
              </span>
            </div>
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS */}
        <div className="flex gap-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit mx-auto">
          <button 
            onClick={() => setActiveTab('resumen')}
            className={`px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'resumen' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            📊 Mi Servicio
          </button>
          <button 
            onClick={() => setActiveTab('soporte')}
            className={`px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'soporte' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            🛠️ Soporte Técnico
          </button>
        </div>

        {/* CONTENIDO DINÁMICO SEGÚN LA PESTAÑA */}
        <div className="animate-in fade-in duration-500">
          {activeTab === 'resumen' ? (
            <div className="space-y-6">
              
              {/* Tarjeta 1: Mis Servicios */}
              <div className="space-y-4">
                <h3 className="text-slate-800 font-bold ml-1">Mis Servicios</h3>

                {datos?.servicios && datos.servicios.length > 0 ? (
                  <div className="space-y-3">
                    {datos.servicios.map((servicio, index) => (
                      <div key={servicio.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className="flex items-center mt-1">
                            <input
                              type="checkbox"
                              id={`servicio-${servicio.id}`}
                              checked={serviciosSeleccionados.includes(servicio.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setServiciosSeleccionados([...serviciosSeleccionados, servicio.id]);
                                } else {
                                  setServiciosSeleccionados(serviciosSeleccionados.filter(id => id !== servicio.id));
                                }
                              }}
                              className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                            />
                          </div>

                          {/* Información del Servicio */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Servicio #{index + 1}</p>
                                <p className="font-bold text-slate-800 text-lg">{servicio.paquete?.nombre || 'Plan'}</p>
                              </div>
                              <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full ${
                                servicio.estado === 'ACTIVO'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {servicio.estado}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-slate-50 p-2 rounded-lg">
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Dirección</p>
                                <p className="text-sm font-semibold text-slate-700">{servicio.direccion || 'N/A'}</p>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg">
                                <p className="text-[10px] text-slate-400 font-bold uppercase">IP Asignada</p>
                                <p className="text-sm font-mono text-blue-600">{servicio.direccionIp || '0.0.0.0'}</p>
                              </div>
                            </div>

                            {/* Facturas del Servicio */}
                            {servicio.facturas && servicio.facturas.length > 0 ? (
                              <div className="space-y-2 pt-2 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Facturas Pendientes:</p>
                                {servicio.facturas
                                  .filter(f => !f.pagada)
                                  .map(factura => (
                                    <div key={factura.id} className="flex justify-between items-center bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                                      <span className="text-sm font-bold text-slate-700">${Number(factura.monto).toFixed(2)}</span>
                                      <span className="text-[9px] text-yellow-700 font-bold uppercase">
                                        Vence: {new Date(factura.vencimiento).toLocaleDateString('es-MX')}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="pt-2 border-t border-slate-100 text-center">
                                <p className="text-[10px] text-green-600 font-bold">✅ Este servicio está al día</p>
                              </div>
                            )}
                          </div>

                          {/* Monto del Servicio */}
                          <div className="text-right">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Precio/Mes</p>
                            <p className="text-xl font-black text-slate-800">${Number(servicio.paquete?.precio || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-6 rounded-2xl text-center text-slate-500 font-medium">
                    No tienes servicios registrados
                  </div>
                )}
              </div>

              {/* Tarjeta 2: Resumen Financiero */}
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-8 text-center border-b border-slate-50">
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-3">
                    {serviciosSeleccionados.length > 0 ? 'Total Seleccionado' : 'Total a Pagar'}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                      <span className="text-2xl font-bold text-slate-400 self-start mt-2">$</span>
                      <h2 className="text-6xl font-black text-slate-800 tracking-tighter">
                          {Number(
                            serviciosSeleccionados.length > 0
                              ? datos?.servicios
                                  ?.filter(s => serviciosSeleccionados.includes(s.id))
                                  ?.reduce((sum, s) => sum + (s.paquete?.precio || 0), 0)
                              : datos?.montoPendiente || 0
                          ).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </h2>
                      <span className="text-lg text-slate-400 font-bold ml-2">MXN</span>
                  </div>
                  
                  <div className="mt-4 inline-block bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                      <p className="text-sm text-slate-500 font-medium">
                        Próximo vencimiento: <span className="font-bold text-slate-800">{fechaVencimientoFormateada}</span>
                      </p>
                  </div>
                </div>
                
                <div className="p-6 bg-slate-50/50">
                  {serviciosSeleccionados.length === 0 && datos?.montoPendiente <= 0 ? (
                    <div className="w-full py-4 text-center text-green-700 font-bold bg-green-100/50 rounded-2xl border border-green-200 flex items-center justify-center gap-2">
                      ✨ ¡Tu cuenta está al día! No tienes pagos pendientes.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={handlePagar}
                        className="w-full bg-primary hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-lg shadow-blue-200/50 transition-all active:scale-[0.98] text-xl flex items-center justify-center gap-3">
                        💳 {serviciosSeleccionados.length > 0 ? `PAGAR ${serviciosSeleccionados.length} SERVICIO(S)` : 'PAGAR AHORA'}
                      </button>
                      {serviciosSeleccionados.length > 0 && (
                        <button
                          onClick={() => setServiciosSeleccionados([])}
                          className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded-lg text-sm">
                          Limpiar Selección
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen de Servicios */}
              <div className="pt-2">
                <h3 className="text-slate-800 font-bold mb-4 ml-1">Resumen por Servicio</h3>
                <div className="space-y-3">
                  {datos?.servicios && datos.servicios.length > 0 ? (
                    datos.servicios.map((servicio) => {
                      const tieneDeuda = servicio.facturas?.some(f => !f.pagada) || false;
                      const montoDeuda = servicio.facturas
                        ?.filter(f => !f.pagada)
                        ?.reduce((sum, f) => sum + f.monto, 0) || 0;

                      return (
                        <div key={servicio.id} className={`p-5 rounded-2xl shadow-sm border flex justify-between items-center ${
                          tieneDeuda
                            ? 'bg-white border-slate-100 hover:border-yellow-200'
                            : 'bg-green-50 border-green-100'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                              tieneDeuda ? 'bg-yellow-50' : 'bg-green-100'
                            }`}>
                              {tieneDeuda ? '⚠️' : '✅'}
                            </div>
                            <div>
                              <p className={`font-bold ${tieneDeuda ? 'text-slate-700' : 'text-green-800'}`}>
                                {servicio.paquete?.nombre || 'Servicio'}
                              </p>
                              <p className={`${tieneDeuda ? 'text-slate-400' : 'text-green-600'} text-xs font-medium`}>
                                {servicio.direccion || 'Sin dirección'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className={`font-black ${tieneDeuda ? 'text-yellow-700' : 'text-green-700'}`}>
                              ${Number(montoDeuda || 0).toFixed(2)}
                            </p>
                            <p className={`text-[10px] font-bold uppercase ${
                              tieneDeuda ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {tieneDeuda ? 'Por Pagar' : 'Al Día'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-slate-400 font-medium">Sin servicios</p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
               <SoporteCliente clienteId={datos?.id} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;