import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, ProtectedRouteAdmin, ProtectedRouteGestores, ProtectedRouteSinVista } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Empresas from './pages/Empresas';
import FichaEmpresa from './pages/FichaEmpresa';
import FormularioInscripcion from './pages/FormularioInscripcion';
import GestionUsuarios from './pages/GestionUsuarios';
import ImportarCsv from './pages/ImportarCsv';
import Dashboard from './pages/Dashboard';
import MisEmpresas from './pages/MisEmpresas';
import DefinirContrasena from './pages/DefinirContrasena';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/set-password" element={<DefinirContrasena />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Empresas />} />
            <Route path="/empresas/:empkey" element={<FichaEmpresa />} />
            <Route path="/mis-empresas" element={<MisEmpresas />} />
            <Route path="/gestion-usuarios" element={
              <ProtectedRouteGestores><GestionUsuarios /></ProtectedRouteGestores>
            } />
            <Route path="/formulario-inscripcion" element={
              <ProtectedRouteSinVista><FormularioInscripcion /></ProtectedRouteSinVista>
            } />
            <Route path="/formulario-inscripcion/:empkey" element={
              <ProtectedRouteSinVista><FormularioInscripcion /></ProtectedRouteSinVista>
            } />
            <Route path="/importar-csv" element={
              <ProtectedRouteAdmin><ImportarCsv /></ProtectedRouteAdmin>
            } />
            <Route path="/dashboard" element={
              <ProtectedRouteAdmin><Dashboard /></ProtectedRouteAdmin>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;