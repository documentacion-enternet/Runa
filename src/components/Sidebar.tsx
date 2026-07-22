import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Typography, Menu, MenuItem, Divider, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Alert, Button,
} from '@mui/material';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import { LockOutlined as LockOutlinedIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const SIDEBAR_WIDTH = 240;

const ETIQUETA_ROL: Record<string, string> = {
  admin: 'Administrador',
  lider: 'Líder de Equipo',
  agente: 'Agente',
  vista: 'Solo Vista',
};

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { perfil, cerrarSesion, esVista, puedeGestionar } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dialogoContrasenaAbierto, setDialogoContrasenaAbierto] = useState(false);
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [errorContrasena, setErrorContrasena] = useState<string | null>(null);
  const [exitoContrasena, setExitoContrasena] = useState(false);
  const [guardandoContrasena, setGuardandoContrasena] = useState(false);

  async function handleGuardarContrasena() {
    setErrorContrasena(null);
    if (nuevaContrasena.length < 8) {
      setErrorContrasena('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setErrorContrasena('Las contraseñas no coinciden');
      return;
    }
    setGuardandoContrasena(true);
    const { error } = await supabase.auth.updateUser({ password: nuevaContrasena });
    setGuardandoContrasena(false);

    if (error) {
      setErrorContrasena(error.message);
      return;
    }
    setExitoContrasena(true);
  }

  function cerrarDialogoContrasena() {
    setDialogoContrasenaAbierto(false);
    setNuevaContrasena('');
    setConfirmarContrasena('');
    setErrorContrasena(null);
    setExitoContrasena(false);
  }

  async function handleLogout() {
    setAnchorEl(null);
    await cerrarSesion();
    navigate('/login');
  }

  const nombreMostrar = perfil?.nombre_completo || perfil?.correo || 'Usuario';
  const iniciales = nombreMostrar.slice(0, 2).toUpperCase();

  // Construir items de navegación según rol
  const navItems = [
    { label: 'Empresas', path: '/', icon: <BusinessOutlinedIcon fontSize="small" /> },
    // Formulario de Inscripción: visible para todos excepto vista
    ...(!esVista ? [{ label: 'Formulario de Inscripción', path: '/formulario-inscripcion', icon: <AssignmentOutlinedIcon fontSize="small" /> }] : []),
    // Gestión de Usuarios: visible para admin y lider
    ...(puedeGestionar ? [{ label: 'Gestión de Usuarios', path: '/gestion-usuarios', icon: <PeopleOutlinedIcon fontSize="small" /> }] : []),
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid #EAE5F5',
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Marca */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2.5 }}>
        <Box
          sx={{
            width: 32, height: 32, borderRadius: '8px', bgcolor: 'text.primary',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>R</Typography>
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1 }}>Runa</Typography>
      </Box>

      <Divider />

      {/* Navegación */}
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {navItems.map((item) => {
          const activo = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              selected={activo}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: '8px',
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'rgba(122, 107, 176, 0.08)',
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                },
                '&.Mui-selected:hover': {
                  bgcolor: 'rgba(122, 107, 176, 0.12)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: activo ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { sx: { fontSize: 13.5, fontWeight: activo ? 700 : 500 } } }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider />

      {/* Footer: perfil de usuario */}
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.2, px: 2, py: 1.8,
          cursor: 'pointer', '&:hover': { bgcolor: 'rgba(122, 107, 176, 0.05)' },
        }}
      >
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
          {iniciales}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nombreMostrar}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
            {ETIQUETA_ROL[perfil?.rol ?? ''] ?? perfil?.rol ?? '...'}
          </Typography>
        </Box>
        <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setAnchorEl(null); setDialogoContrasenaAbierto(true); }} sx={{ fontSize: 13.5, gap: 1.2 }}>
          <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          Cambiar contraseña
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ fontSize: 13.5, gap: 1.2 }}>
          <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
          Cerrar sesión
        </MenuItem>
      </Menu>

      {/* Diálogo: Cambiar contraseña */}
      <Dialog open={dialogoContrasenaAbierto} onClose={cerrarDialogoContrasena} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Cambiar contraseña</DialogTitle>
        <DialogContent>
          {exitoContrasena ? (
            <Alert severity="success" sx={{ borderRadius: '8px' }}>Tu contraseña se actualizó correctamente.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
              {errorContrasena && <Alert severity="error" sx={{ borderRadius: '8px' }}>{errorContrasena}</Alert>}
              <TextField
                label="Nueva contraseña" type="password" fullWidth autoFocus
                value={nuevaContrasena} onChange={(e) => setNuevaContrasena(e.target.value)}
                helperText="Mínimo 8 caracteres"
              />
              <TextField
                label="Confirmar contraseña" type="password" fullWidth
                value={confirmarContrasena} onChange={(e) => setConfirmarContrasena(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={cerrarDialogoContrasena} sx={{ color: 'text.secondary' }}>
            {exitoContrasena ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!exitoContrasena && (
            <Button onClick={handleGuardarContrasena} disabled={guardandoContrasena} variant="contained">
              {guardandoContrasena ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}

export { SIDEBAR_WIDTH };