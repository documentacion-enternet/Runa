import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, ProtectedRouteGestores, ProtectedRouteSinVista } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Empresas from './pages/Empresas';
import FichaEmpresa from './pages/FichaEmpresa';
import FormularioInscripcion from './pages/FormularioInscripcion';
import GestionUsuarios from './pages/GestionUsuarios';
import DefinirContrasena from './pages/DefinirContrasena';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/set-password" element={<DefinirContrasena />} />
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Empresas y Ficha: todos los roles logueados pueden ver */}
            <Route path="/" element={<Empresas />} />
            <Route path="/empresas/:empkey" element={<FichaEmpresa />} />

            {/* Gestión de Usuarios: solo admin y lider */}
            <Route path="/gestion-usuarios" element={
              <ProtectedRouteGestores>
                <GestionUsuarios />
              </ProtectedRouteGestores>
            } />

            {/* Formulario de Inscripción: admin, lider y agente — no vista */}
            <Route path="/formulario-inscripcion" element={
              <ProtectedRouteSinVista>
                <FormularioInscripcion />
              </ProtectedRouteSinVista>
            } />
            <Route path="/formulario-inscripcion/:empkey" element={
              <ProtectedRouteSinVista>
                <FormularioInscripcion />
              </ProtectedRouteSinVista>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;