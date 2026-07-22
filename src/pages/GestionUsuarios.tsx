import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Card, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Alert, CircularProgress, Avatar, IconButton,
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { EditOutlined as EditOutlinedIcon, DeleteOutlined as DeleteOutlineIcon } from '@mui/icons-material';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

type RolPerfil = 'admin' | 'lider' | 'agente' | 'vista';

type Perfil = {
  id: string;
  nombre_completo: string | null;
  correo: string | null;
  rol: RolPerfil;
  created_at: string;
};

const ETIQUETA_ROL: Record<RolPerfil, string> = {
  admin: 'Admin',
  lider: 'Líder',
  agente: 'Agente',
  vista: 'Vista',
};

const COLOR_ROL: Record<RolPerfil, { bg: string; color: string }> = {
  admin:  { bg: 'rgba(122,107,176,0.12)', color: '#695A9E' },
  lider:  { bg: 'rgba(91,78,130,0.12)',   color: '#5B4E82' },
  agente: { bg: 'rgba(94,156,122,0.12)',  color: '#4C8467' },
  vista:  { bg: 'rgba(183,155,133,0.15)', color: '#8A6E55' },
};

export default function GestionUsuarios() {
  const { session, refrescarPerfil, esAdmin, esLider } = useAuth();
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // --- Crear (invitar) ---
  const [dialogoInvitarAbierto, setDialogoInvitarAbierto] = useState(false);
  const [correo, setCorreo] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rol, setRol] = useState<RolPerfil>('agente');
  const [enviando, setEnviando] = useState(false);

  // --- Actualizar (nombre + rol) ---
  const [usuarioEditando, setUsuarioEditando] = useState<Perfil | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [rolEditado, setRolEditado] = useState<RolPerfil>('agente');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // --- Eliminar ---
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Perfil | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function cargarUsuarios() {
    setCargando(true);
    const { data } = await supabase.from('perfiles').select('*').order('created_at', { ascending: true });
    setUsuarios(data ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  function iniciales(texto: string) {
    return texto.slice(0, 2).toUpperCase();
  }

  // El lider solo puede tocar usuarios con rol agente o vista
  function liderPuedeTocar(u: Perfil): boolean {
    if (esAdmin) return true;
    if (esLider) return u.rol === 'agente' || u.rol === 'vista';
    return false;
  }

  // Roles disponibles según quién invita
  const rolesDisponiblesParaInvitar: RolPerfil[] = esAdmin
    ? ['agente', 'vista', 'lider', 'admin']
    : ['agente', 'vista']; // lider solo puede crear agente o vista

  // Roles disponibles al editar (el lider no puede subir a alguien a lider/admin)
  const rolesDisponiblesParaEditar: RolPerfil[] = esAdmin
    ? ['agente', 'vista', 'lider', 'admin']
    : ['agente', 'vista'];

  // --- Crear ---
  async function enviarInvitacion() {
    if (!correo.trim() || !correo.includes('@')) {
      setError('Ingresa un correo válido');
      return;
    }
    setEnviando(true);
    setError(null);

    const { data, error: errorFuncion } = await supabase.functions.invoke('invite-user', {
      body: { email: correo.trim(), rol, nombre_completo: nombreCompleto.trim() || undefined },
    });

    setEnviando(false);

    if (errorFuncion || data?.error) {
      setError(data?.error || errorFuncion?.message || 'No se pudo enviar la invitación');
      return;
    }

    setExito(`Invitación enviada a ${correo.trim()}`);
    setCorreo('');
    setNombreCompleto('');
    setRol('agente');
    setDialogoInvitarAbierto(false);
    cargarUsuarios();
  }

  // --- Actualizar ---
  function abrirEdicion(u: Perfil) {
    setUsuarioEditando(u);
    setNombreEditado(u.nombre_completo || '');
    setRolEditado(u.rol);
    setError(null);
  }

  async function guardarEdicion() {
    if (!usuarioEditando) return;
    setGuardandoEdicion(true);
    setError(null);

    const { error: errorUpdate } = await supabase
      .from('perfiles')
      .update({ nombre_completo: nombreEditado.trim() || null, rol: rolEditado })
      .eq('id', usuarioEditando.id);

    setGuardandoEdicion(false);

    if (errorUpdate) {
      setError('No se pudo actualizar: ' + errorUpdate.message);
      return;
    }

    if (usuarioEditando.id === session?.user.id) refrescarPerfil();
    setUsuarioEditando(null);
    cargarUsuarios();
  }

  // --- Eliminar ---
  async function confirmarEliminar() {
    if (!usuarioAEliminar) return;
    setEliminando(true);
    setError(null);

    const { data, error: errorFuncion } = await supabase.functions.invoke('delete-user', {
      body: { userId: usuarioAEliminar.id },
    });

    setEliminando(false);

    if (errorFuncion || data?.error) {
      setError(data?.error || errorFuncion?.message || 'No se pudo eliminar el usuario');
      setUsuarioAEliminar(null);
      return;
    }

    setExito(`Cuenta de ${usuarioAEliminar.correo} eliminada`);
    setUsuarioAEliminar(null);
    cargarUsuarios();
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 4, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="h5">Gestión de Usuarios</Typography>
        <Button startIcon={<PersonAddOutlinedIcon />} variant="contained" onClick={() => { setRol('agente'); setDialogoInvitarAbierto(true); }}>
          Invitar usuario
        </Button>
      </Box>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Cuentas con acceso a Runa
      </Typography>

      {exito && <Alert severity="success" sx={{ mb: 2, borderRadius: '8px' }} onClose={() => setExito(null)}>{exito}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }} onClose={() => setError(null)}>{error}</Alert>}

      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          {usuarios.map((u, i) => {
            const puedeTocar = liderPuedeTocar(u);
            const esMiCuenta = u.id === session?.user.id;
            return (
              <Box
                key={u.id}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.8,
                  borderBottom: i < usuarios.length - 1 ? '1px solid #EAE5F5' : 'none',
                  // Filas de admin/lider que el lider no puede tocar: aspecto levemente atenuado
                  opacity: esLider && !puedeTocar ? 0.6 : 1,
                }}
              >
                <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
                  {iniciales(u.nombre_completo || u.correo || '??')}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                    {u.nombre_completo || '(sin nombre configurado)'}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{u.correo}</Typography>
                </Box>
                <Chip
                  label={ETIQUETA_ROL[u.rol] ?? u.rol}
                  size="small"
                  sx={{
                    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                    bgcolor: COLOR_ROL[u.rol]?.bg ?? 'rgba(139,132,163,0.12)',
                    color: COLOR_ROL[u.rol]?.color ?? 'text.secondary',
                  }}
                />
                {puedeTocar && (
                  <>
                    <IconButton size="small" onClick={() => abrirEdicion(u)}>
                      <EditOutlinedIcon fontSize="small" sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </IconButton>
                    {!esMiCuenta && (
                      <IconButton size="small" onClick={() => setUsuarioAEliminar(u)}>
                        <DeleteOutlineIcon fontSize="small" sx={{ fontSize: 16, color: 'error.main' }} />
                      </IconButton>
                    )}
                  </>
                )}
              </Box>
            );
          })}
          {usuarios.length === 0 && (
            <Typography sx={{ fontSize: 13, color: 'text.disabled', textAlign: 'center', py: 4 }}>
              No hay usuarios registrados todavía.
            </Typography>
          )}
        </Card>
      )}

      {/* Diálogo: Crear (invitar) */}
      <Dialog open={dialogoInvitarAbierto} onClose={() => setDialogoInvitarAbierto(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Invitar nuevo usuario</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
            Le llegará un correo con un link para que defina su propia contraseña.
          </Typography>
          <TextField
            label="Correo" type="email" fullWidth value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Nombre completo (opcional)" fullWidth value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            select label="Rol" fullWidth value={rol}
            onChange={(e) => setRol(e.target.value as RolPerfil)}
          >
            {rolesDisponiblesParaInvitar.map((r) => (
              <MenuItem key={r} value={r}>{ETIQUETA_ROL[r]}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogoInvitarAbierto(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={enviarInvitacion} disabled={enviando} variant="contained">
            {enviando ? 'Enviando...' : 'Enviar invitación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: Actualizar (nombre + rol) */}
      <Dialog open={!!usuarioEditando} onClose={() => setUsuarioEditando(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Editar usuario</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
            {usuarioEditando?.correo}
          </Typography>
          <TextField
            label="Nombre completo" fullWidth value={nombreEditado}
            onChange={(e) => setNombreEditado(e.target.value)}
            sx={{ mb: 2 }}
            autoFocus
          />
          <TextField
            select label="Rol" fullWidth value={rolEditado}
            onChange={(e) => setRolEditado(e.target.value as RolPerfil)}
            disabled={usuarioEditando?.id === session?.user.id}
            helperText={usuarioEditando?.id === session?.user.id ? 'No puedes cambiar tu propio rol' : ''}
          >
            {rolesDisponiblesParaEditar.map((r) => (
              <MenuItem key={r} value={r}>{ETIQUETA_ROL[r]}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setUsuarioEditando(null)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={guardarEdicion} disabled={guardandoEdicion} variant="contained">
            {guardandoEdicion ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: Eliminar */}
      <Dialog open={!!usuarioAEliminar} onClose={() => setUsuarioAEliminar(null)}>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>¿Eliminar esta cuenta?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            <strong>{usuarioAEliminar?.correo}</strong> perderá acceso a Runa de forma permanente. Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setUsuarioAEliminar(null)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={confirmarEliminar} disabled={eliminando} variant="contained" color="error">
            {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}