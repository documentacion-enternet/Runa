import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';

// Ruta básica: solo requiere estar logueado
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, cargando } = useAuth();

  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: '#7A6BB0' }} />
      </Box>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

// Ruta que requiere al menos rol admin o lider (bloquea agente y vista)
export function ProtectedRouteGestores({ children }: { children: ReactNode }) {
  const { session, perfil, cargando } = useAuth();

  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: '#7A6BB0' }} />
      </Box>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (perfil && perfil.rol !== 'admin' && perfil.rol !== 'lider') return <Navigate to="/" replace />;

  return <>{children}</>;
}

// Ruta que requiere exclusivamente rol admin (bloquea lider, agente y vista)
export function ProtectedRouteAdmin({ children }: { children: ReactNode }) {
  const { session, perfil, cargando } = useAuth();

  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: '#7A6BB0' }} />
      </Box>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (perfil && perfil.rol !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
}

// Ruta que bloquea solo al rol vista (permite admin, lider y agente)
export function ProtectedRouteSinVista({ children }: { children: ReactNode }) {
  const { session, perfil, cargando } = useAuth();

  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: '#7A6BB0' }} />
      </Box>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (perfil && perfil.rol === 'vista') return <Navigate to="/" replace />;

  return <>{children}</>;
}