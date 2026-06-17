// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
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
import CobranzaMasiva from './pages/CobranzaMasiva';
import Paquetes from './pages/Paquetes';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas del portal de cliente — requieren sesión con rol CLIENTE */}
        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        <Route path="/pagar" element={
          <PrivateRoute><PaymentOptions /></PrivateRoute>
        } />
        <Route path="/pagar/ticket" element={
          <PrivateRoute><PaymentTicket /></PrivateRoute>
        } />
        <Route path="/pagar/tarjeta" element={
          <PrivateRoute><CardPayment /></PrivateRoute>
        } />

        {/* Rutas del panel admin — requieren sesión con rol ADMIN */}
        <Route path="/admin" element={
          <AdminRoute><AdminPanel /></AdminRoute>
        } />
        <Route path="/admin/torres" element={
          <AdminRoute><TorresPanel /></AdminRoute>
        } />
        <Route path="/admin/mapa" element={
          <AdminRoute><MapaPanel /></AdminRoute>
        } />
        <Route path="/admin/logistica" element={
          <AdminRoute><Logistica /></AdminRoute>
        } />
        <Route path="/admin/cliente/:id" element={
          <AdminRoute><DetalleCliente /></AdminRoute>
        } />
        <Route path="/admin/cobranza" element={
          <AdminRoute><CobranzaMasiva /></AdminRoute>
        } />
        <Route path="/admin/paquetes" element={
          <AdminRoute><Paquetes /></AdminRoute>
        } />

        {/* Cualquier ruta desconocida → landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;