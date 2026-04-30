// src/App.jsx
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PaymentOptions from './pages/PaymentOptions';
import PaymentTicket from './pages/PaymentTicket';
import CardPayment from './pages/CardPayment';
import AdminPanel from './pages/AdminPanel';
import TorresPanel from './pages/TorresPanel';
import MapaPanel from './pages/MapaPanel';
import Logistica from './pages/Logistica';
import DetalleCliente from './pages/DetalleCliente';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pagar" element={<PaymentOptions />} />
        <Route path="/pagar/ticket" element={<PaymentTicket />} />
        <Route path="/pagar/tarjeta" element={<CardPayment />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/torres" element={<TorresPanel />} />
        <Route path="/admin/mapa" element={<MapaPanel />} />
        <Route path="/admin/logistica" element={<Logistica />} />
        <Route path="/admin/cliente/:id" element={<DetalleCliente />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;