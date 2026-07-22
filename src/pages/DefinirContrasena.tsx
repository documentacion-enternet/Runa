import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Typography, TextField, Button, Alert, CircularProgress, LinearProgress, Zoom } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabaseClient';

export default function DefinirContrasena() {
  const navigate = useNavigate();
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [sesionValida, setSesionValida] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    // El link mágico ya dejó una sesión activa (Supabase la detecta sola desde el hash de la URL)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesionValida(!!session);
      setVerificandoSesion(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setGuardando(true);
    const { error: errorUpdate } = await supabase.auth.updateUser({ password });
    setGuardando(false);

    if (errorUpdate) {
      setError(errorUpdate.message);
      return;
    }

    setExito(true);
  }

  useEffect(() => {
    if (!exito) return;
    confetti({
      particleCount: 90,
      spread: 65,
      origin: { y: 0.5 },
      colors: ['#7A6BB0', '#5E9C7C', '#B79B85', '#5B4E82'],
    });
    const inicio = Date.now();
    const duracion = 1600;
    const intervalo = setInterval(() => {
      const avance = Math.min(100, ((Date.now() - inicio) / duracion) * 100);
      setProgreso(avance);
      if (avance >= 100) {
        clearInterval(intervalo);
        navigate('/');
      }
    }, 16);
    return () => clearInterval(intervalo);
  }, [exito, navigate]);

  if (verificandoSesion) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (!sesionValida) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', px: 2 }}>
        <Card sx={{ maxWidth: 380, p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Link no válido o vencido</Typography>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 2 }}>
            Este link ya se usó o expiró. Pide al admin que te envíe una nueva invitación, o usa "Olvidé mi contraseña" en el Login.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/login')}>Ir al Login</Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', px: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 380, p: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Zoom in={exito} timeout={450} style={{ transitionDelay: exito ? '80ms' : '0ms', display: exito ? 'block' : 'none' }}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: '16px', mb: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #8C7EC7 0%, #5E9C7C 100%)',
                boxShadow: '0 6px 20px rgba(122,107,176,0.35)',
              }}
            >
              <CheckCircleIcon sx={{ color: '#fff', fontSize: 30 }} />
            </Box>
          </Zoom>
          {!exito && (
            <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'text.primary', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>R</Typography>
            </Box>
          )}
          <Typography variant="h5" sx={{ mb: 0.5 }}>{exito ? '¡Contraseña creada!' : 'Define tu contraseña'}</Typography>
          <Typography variant="subtitle1">{exito ? 'Entrando a Runa...' : 'Último paso para entrar a Runa'}</Typography>
        </Box>

        {exito ? (
          <Box sx={{ px: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progreso}
              sx={{
                height: 5, borderRadius: 999, bgcolor: '#EAE5F5',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 999,
                  backgroundImage: 'linear-gradient(90deg, #7A6BB0 0%, #5E9C7C 100%)',
                },
              }}
            />
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error" sx={{ borderRadius: '8px' }}>{error}</Alert>}
            <TextField
              label="Nueva contraseña" type="password" fullWidth required
              value={password} onChange={(e) => setPassword(e.target.value)}
              helperText="Mínimo 8 caracteres"
            />
            <TextField
              label="Confirmar contraseña" type="password" fullWidth required
              value={confirmarPassword} onChange={(e) => setConfirmarPassword(e.target.value)}
            />
            <Button
              type="submit" variant="contained" size="large" disabled={guardando}
              startIcon={guardando ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : undefined}
              sx={{ mt: 1, py: 1.2 }}
            >
              {guardando ? 'Guardando...' : 'Guardar y entrar a Runa'}
            </Button>
          </Box>
        )}
      </Card>
    </Box>
  );
}