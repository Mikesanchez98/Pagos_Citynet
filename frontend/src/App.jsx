// src/App.jsx
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PaymentOptions from './pages/PaymentOptions';
import PaymentTicket from './pages/PaymentTicket';
import CardPayment from './pages/CardPayment';
import AdminPanel from './pages/AdminPanel';

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
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;