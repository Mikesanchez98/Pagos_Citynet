// src/pages/PaymentOptions.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentOptions = () => {
  const navigate = useNavigate();

  const handleSelectOption = (option) => {
    console.log("Opción seleccionada:", option);
    if (option === 'card') {
      // Aquí irá la lógica para abrir el formulario de Openpay
      alert("Redirigiendo a pago con tarjeta...");
    } else {
      // Aquí irá la llamada a tu API para generar la ficha
      alert("Generando ficha para pago en efectivo...");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cabecera con botón de Volver */}
      <div className="bg-white p-4 border-b border-slate-200 flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <span className="text-xl">←</span>
        </button>
        <h2 className="font-bold text-slate-800 text-lg">Método de Pago</h2>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-4">
        <p className="text-slate-500 text-sm font-medium px-1">
          Elige cómo deseas liquidar tu saldo de **$550.00 MXN**
        </p>

        {/* Opción 1: Tarjeta */}
        <button 
          onClick={() => handleSelectOption('card')}
          className="w-full bg-white p-5 rounded-2xl border-2 border-transparent hover:border-primary shadow-sm flex items-center justify-between transition-all group active:scale-[0.98]"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="text-3xl bg-blue-50 w-14 h-14 flex items-center justify-center rounded-xl group-hover:bg-blue-100 transition-colors">
              💳
            </div>
            <div>
              <p className="font-bold text-slate-800">Tarjeta de Crédito / Débito</p>
              <p className="text-xs text-slate-500">Aceptamos VISA, Mastercard y AMEX</p>
              <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase">Acreditación inmediata</p>
            </div>
          </div>
          <span className="text-slate-300 group-hover:text-primary transition-colors">→</span>
        </button>

        {/* Opción 2: Efectivo / Tiendas */}
        <button 
          onClick={() => handleSelectOption('cash')}
          className="w-full bg-white p-5 rounded-2xl border-2 border-transparent hover:border-primary shadow-sm flex items-center justify-between transition-all group active:scale-[0.98]"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="text-3xl bg-orange-50 w-14 h-14 flex items-center justify-center rounded-xl group-hover:bg-orange-100 transition-colors">
              🏪
            </div>
            <div>
              <p className="font-bold text-slate-800">Pago en Efectivo</p>
              <p className="text-xs text-slate-500">Oxxo, 7-Eleven, Farmacias del Ahorro</p>
              <p className="text-[10px] text-orange-600 font-bold mt-1 uppercase">Se acredita en 1-2 horas</p>
            </div>
          </div>
          <span className="text-slate-300 group-hover:text-primary transition-colors">→</span>
        </button>

        {/* Aviso de seguridad */}
        <div className="mt-10 p-4 bg-slate-100 rounded-xl border border-slate-200">
          <div className="flex gap-3">
            <span className="text-slate-400">🔒</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tus pagos son procesados de forma segura por **Openpay by BBVA**. Citynet no almacena los datos de tu tarjeta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentOptions;