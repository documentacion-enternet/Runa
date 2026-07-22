import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, TextField, Button, Typography, Alert, InputAdornment,
  Link, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  // --- Olvidé mi contraseña ---
  const [dialogoRecuperarAbierto, setDialogoRecuperarAbierto] = useState(false);
  const [correoRecuperar, setCorreoRecuperar] = useState('');
  const [enviandoRecuperacion, setEnviandoRecuperacion] = useState(false);
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState<string | null>(null);

  async function handleRecuperarPassword() {
    if (!correoRecuperar.trim() || !correoRecuperar.includes('@')) {
      setMensajeRecuperacion('Ingresa un correo válido');
      return;
    }
    setEnviandoRecuperacion(true);
    setMensajeRecuperacion(null);

    const { data } = await supabase.functions.invoke('request-password-reset', {
      body: { email: correoRecuperar.trim() },
    });

    setEnviandoRecuperacion(false);
    setMensajeRecuperacion(data?.message || 'Si el correo existe en Runa, te llegará un link para restablecer tu contraseña.');
  }

  function cerrarDialogoRecuperar() {
    setDialogoRecuperarAbierto(false);
    setCorreoRecuperar('');
    setMensajeRecuperacion(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    });

    setCargando(false);

    if (error) {
      setError('Correo o contraseña incorrectos. Inténtalo de nuevo.');
      return;
    }

    navigate('/');
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 380, p: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 48, height: 48, borderRadius: '12px',
              bgcolor: 'text.primary', display: 'flex', alignItems: 'center',
              justifyContent: 'center', mb: 2,
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>R</Typography>
          </Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Runa</Typography>
          <Typography variant="subtitle1">Menos vueltas, mejor atención</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={cargando}
            sx={{ mt: 1, py: 1.2 }}
          >
            {cargando ? 'Ingresando...' : 'Iniciar sesión'}
          </Button>

          <Link
            component="button"
            type="button"
            onClick={() => setDialogoRecuperarAbierto(true)}
            sx={{ fontSize: 12.5, color: 'text.secondary', textAlign: 'center', mt: -0.5 }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </Box>
      </Card>

      {/* Diálogo: Olvidé mi contraseña */}
      <Dialog open={dialogoRecuperarAbierto} onClose={cerrarDialogoRecuperar} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Restablecer contraseña</DialogTitle>
        <DialogContent>
          {mensajeRecuperacion ? (
            <Alert severity="success" sx={{ borderRadius: '8px' }}>{mensajeRecuperacion}</Alert>
          ) : (
            <>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
                Ingresa tu correo y te mandamos un link para crear una nueva contraseña.
              </Typography>
              <TextField
                label="Correo" type="email" fullWidth autoFocus
                value={correoRecuperar}
                onChange={(e) => setCorreoRecuperar(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={cerrarDialogoRecuperar} sx={{ color: 'text.secondary' }}>
            {mensajeRecuperacion ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!mensajeRecuperacion && (
            <Button onClick={handleRecuperarPassword} disabled={enviandoRecuperacion} variant="contained">
              {enviandoRecuperacion ? 'Enviando...' : 'Enviar link'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}