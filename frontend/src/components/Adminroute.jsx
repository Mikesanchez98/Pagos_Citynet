// src/components/AdminRoute.jsx
// Protege rutas exclusivas del panel de administración.
// Sin sesión         → redirige a /login
// Con sesión CLIENTE → redirige a /dashboard (acceso denegado sin error visible)
// Con sesión ADMIN   → renderiza la ruta normalmente

import { Navigate, useLocation } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('user') || 'null');
  const location = useLocation();

  // Sin sesión → al login
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Sesión de cliente intentando acceder al panel admin → a su dashboard
  if (user.rol !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;