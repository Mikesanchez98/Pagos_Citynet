// src/components/PrivateRoute.jsx
// Protege rutas que requieren sesión activa.
// Si no hay token → redirige a /login.
// Si hay token y el usuario es ADMIN intentando entrar a rutas de cliente → redirige a /admin.

import { Navigate, useLocation } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('user') || 'null');
  const location = useLocation();

  // Sin sesión → al login, conservando la ruta original para redirigir después
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin que intenta entrar al portal de cliente → redirigir a su panel
  if (user.rol === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default PrivateRoute;