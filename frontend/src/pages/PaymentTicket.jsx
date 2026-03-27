// src/pages/PaymentTicket.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoCitynet from '../assets/logo-citynet-antiguo.png';

const PaymentTicket = () => {
  const navigate = useNavigate();

  const ticketData = {
    monto: 550.00,
    referencia: "8012 3456 7890 1234",
    convenio: "123456",
    vence: "05 de Abril, 2026",
  };

  return (
    // Quitamos el fondo gris al imprimir con print:bg-white
    <div className="min-h-screen bg-slate-100 pb-10 print:bg-white print:pb-0">
      
      {/* Navbar: SE OCULTA AL IMPRIMIR */}
      <div className="bg-white p-4 shadow-sm flex items-center gap-4 mb-6 print:hidden">
        <button onClick={() => navigate('/pagar')} className="p-2">←</button>
        <h2 className="font-bold text-slate-800">Ficha de Pago</h2>
      </div>

      <div className="max-w-md mx-auto px-4 print:p-0 print:max-w-none">
        
        {/* EL TICKET: Le quitamos sombras y bordes redondeados en la impresión para que sea más limpio */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:rounded-none">
          
          {/* Encabezado del Ticket */}
          <div className="p-6 text-center border-b border-dashed border-slate-200 relative">
            {/* Ocultamos los círculos decorativos laterales en la impresión */}
            <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-slate-100 rounded-full border border-slate-200 print:hidden"></div>
            <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-slate-100 rounded-full border border-slate-200 print:hidden"></div>
            
            <img src={logoCitynet} alt="Citynet" className="h-12 mx-auto mb-3 object-contain" />
            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Pago en Efectivo</p>
            <h3 className="text-3xl font-black text-slate-800 mt-2">${ticketData.monto.toFixed(2)}</h3>
          </div>

          {/* Cuerpo del Ticket: CÓDIGO DE BARRAS */}
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-slate-700 mb-4">Muestra este código en caja:</p>
            
            <div className="bg-white border-2 border-slate-100 rounded-xl p-6 mb-4 flex flex-col items-center print:border-slate-300">
                <img 
                    src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${ticketData.referencia.replace(/\s/g, '')}&scale=2&rotate=N&includetext`} 
                    alt="Código de Barras"
                    className="max-w-full h-auto"
                />
                <p className="mt-4 font-mono text-lg font-bold tracking-[0.3em] text-slate-800">
                    {ticketData.referencia}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left mt-6">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Convenio</p>
                <p className="text-sm font-bold text-slate-700">{ticketData.convenio}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Vencimiento</p>
                <p className="text-sm font-bold text-red-600">{ticketData.vence}</p>
              </div>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-slate-50 p-6 border-t border-slate-100 print:bg-white">
            <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">¿Dónde pagar?</p>
            {/* Ocultamos los logos/badges de tiendas para ahorrar tinta y espacio */}
            <div className="flex flex-wrap gap-4 opacity-70 mb-4 print:hidden">
                <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200">OXXO</span>
                <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200">7-ELEVEN</span>
                <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200">WALMART</span>
            </div>
            <ul className="text-[11px] text-slate-500 space-y-2 list-disc pl-4 print:text-slate-700">
                <li>Dile al cajero que realizarás un pago de **Paynet**.</li>
                <li>Conserva tu ticket físico como comprobante de pago.</li>
            </ul>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN: SE OCULTAN AL IMPRIMIR */}
        <div className="mt-6 space-y-3 print:hidden">
            <button 
                onClick={() => window.print()} 
                className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
                🖨️ Imprimir Ticket
            </button>
            <button 
                onClick={() => navigate('/dashboard')}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl"
            >
                Volver al Inicio
            </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentTicket;