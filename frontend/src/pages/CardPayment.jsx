// src/pages/CardPayment.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CardPayment = () => {
  const navigate = useNavigate();
  const [cardData, setCardData] = useState({
    name: '',
    number: '',
    expiry: '',
    cvv: ''
  });

  const handleInput = (e) => {
    const { name, value } = e.target;
    // Limitamos caracteres para simular validación básica
    if (name === 'number' && value.length > 16) return;
    if (name === 'expiry' && value.length > 5) return;
    if (name === 'cvv' && value.length > 4) return;
    setCardData({ ...cardData, [name]: value });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/pagar')} className="p-2">←</button>
        <h2 className="font-bold text-slate-800">Pago con Tarjeta</h2>
      </div>

      <div className="max-w-md mx-auto px-6">
        
        {/* VISTA PREVIA DE LA TARJETA (Efecto Visual) */}
        <div className="w-full h-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-2xl mb-8 relative overflow-hidden transition-all transform hover:scale-105">
          <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl font-bold italic text-white">VISA</div>
          <div className="flex flex-col h-full justify-between">
            <div className="w-12 h-10 bg-yellow-400/80 rounded-md mb-4 shadow-inner"></div> {/* Chip */}
            <div className="text-xl tracking-[0.2em] font-mono">
              {cardData.number || '•••• •••• •••• ••••'}
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase opacity-60">Titular</p>
                <p className="text-sm font-medium tracking-wide uppercase">{cardData.name || 'NOMBRE COMPLETO'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase opacity-60">Expira</p>
                <p className="text-sm font-medium">{cardData.expiry || 'MM/YY'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* FORMULARIO DE PAGO */}
        <form className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre en la tarjeta</label>
            <input 
              name="name"
              type="text"
              placeholder="Ej. JUAN PEREZ"
              className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary outline-none uppercase"
              onChange={handleInput}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Número de tarjeta</label>
            <input 
              name="number"
              type="number"
              placeholder="0000 0000 0000 0000"
              className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary outline-none"
              onChange={handleInput}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vencimiento</label>
              <input 
                name="expiry"
                type="text"
                placeholder="MM/YY"
                className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary outline-none text-center"
                onChange={handleInput}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CVV</label>
              <input 
                name="cvv"
                type="password"
                placeholder="000"
                className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary outline-none text-center"
                onChange={handleInput}
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="button"
              className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
              🔒 PAGAR $550.00 MXN
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-4 px-4 leading-relaxed">
              Al hacer clic en pagar, aceptas los términos de servicio. Esta transacción está protegida por encriptación SSL de 256 bits.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CardPayment;