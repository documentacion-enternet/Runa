import { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Alert, Chip,
  ToggleButtonGroup, ToggleButton, CircularProgress, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
} from '@mui/material';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

type TipoSolicitud = 'solicitud' | 'mejora';
type EstadoSolicitud = 'entregado' | 'en_progreso' | 'finalizado';

interface Adjunto { nombre: string; base64: string; tipo: string; }

interface SolicitudRow {
  id: string;
  created_at: string;
  titulo: string;
  tipo: string;
  descripcion: string;
  estado: EstadoSolicitud;
}

const ESTADO_CONFIG: Record<EstadoSolicitud, { label: string; color: string; bg: string }> = {
  entregado:   { label: 'Entregado',   color: '#695A9E', bg: 'rgba(122,107,176,0.1)' },
  en_progreso: { label: 'En progreso', color: '#B07D2B', bg: 'rgba(255,180,50,0.12)' },
  finalizado:  { label: 'Finalizado',  color: '#2E7D5E', bg: 'rgba(94,156,122,0.12)' },
};

export default function Solicitudes() {
  const { session, perfil } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoSolicitud>('solicitud');
  const [descripcion, setDescripcion] = useState('');
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [historial, setHistorial] = useState<SolicitudRow[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cargarHistorial(); }, []);

  async function cargarHistorial() {
    setCargandoHistorial(true);
    const { data } = await supabase
      .from('solicitudes')
      .select('id, created_at, titulo, tipo, descripcion, estado')
      .order('created_at', { ascending: false });
    setHistorial((data as SolicitudRow[]) ?? []);
    setCargandoHistorial(false);
  }

  async function comprimirImagen(archivo: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(archivo);
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
      };
      img.src = url;
    });
  }

  async function handleAgregarImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    const nuevos: Adjunto[] = [];
    for (const archivo of archivos) {
      if (!archivo.type.startsWith('image/')) continue;
      if (adjuntos.length + nuevos.length >= 5) break;
      const base64 = await comprimirImagen(archivo);
      nuevos.push({ nombre: archivo.name, base64, tipo: 'image/jpeg' });
    }
    setAdjuntos((prev) => [...prev, ...nuevos]);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleEnviar() {
    setError(null);
    if (!titulo.trim()) { setError('El título es obligatorio.'); return; }
    if (!descripcion.trim()) { setError('La descripción es obligatoria.'); return; }
    setEnviando(true);
    try {
      // 1. Guardar en DB
      const { error: dbError } = await supabase.from('solicitudes').insert({
        titulo: titulo.trim(),
        tipo,
        descripcion: descripcion.trim(),
        estado: 'entregado',
        usuario_id: session?.user.id,
        usuario_nombre: perfil?.nombre_completo ?? perfil?.correo ?? 'Usuario',
        usuario_correo: perfil?.correo ?? session?.user.email ?? '',
        usuario_rol: perfil?.rol ?? '',
      });
      if (dbError) throw dbError;

      // 2. Enviar correo
      const { error: fnError } = await supabase.functions.invoke('send-solicitud', {
        body: {
          titulo: titulo.trim(), tipo, descripcion: descripcion.trim(), adjuntos,
          remitente: {
            nombre: perfil?.nombre_completo ?? perfil?.correo ?? 'Usuario',
            correo: perfil?.correo ?? session?.user.email ?? '',
            rol: perfil?.rol ?? '',
          },
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (fnError) throw fnError;

      setExito(true);
      setTitulo(''); setDescripcion(''); setAdjuntos([]); setTipo('solicitud');
      setMostrarForm(false);
      cargarHistorial();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  function resetForm() {
    setExito(false); setError(null);
    setTitulo(''); setDescripcion(''); setAdjuntos([]); setTipo('solicitud');
    setMostrarForm(true);
  }

  const TIPO_LABEL: Record<string, string> = { solicitud: 'Consulta / Solicitud', mejora: 'Mejora / Sugerencia' };

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', py: 4, px: { xs: 2, sm: 3 } }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Solicitudes y Mejoras</Typography>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            ¿Necesitas algo nuevo en Runa o tienes una consulta? Cuéntanos aquí.
          </Typography>
        </Box>
        {!mostrarForm && !exito && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setMostrarForm(true)}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}>
            Nueva solicitud
          </Button>
        )}
      </Box>

      {/* Formulario */}
      {(mostrarForm || exito) && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', mb: 3 }}>
          {exito ? (
            <Alert severity="success" sx={{ borderRadius: '8px' }}
              action={<Button size="small" onClick={resetForm}>Nueva solicitud</Button>}>
              ¡Listo! Tu solicitud fue enviada. Te contactaremos pronto.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Nueva solicitud</Typography>
              {error && <Alert severity="error" sx={{ borderRadius: '8px' }} onClose={() => setError(null)}>{error}</Alert>}

              <TextField label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} fullWidth
                placeholder="Ej: No puedo ver las empresas asignadas" />

              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tipo</Typography>
                <ToggleButtonGroup value={tipo} exclusive onChange={(_, val) => { if (val) setTipo(val); }} size="small">
                  <ToggleButton value="solicitud" sx={{ px: 2.5, fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: '8px !important', '&.Mui-selected': { bgcolor: 'rgba(122,107,176,0.12)', color: 'primary.main', borderColor: 'primary.main' } }}>
                    Consulta / Solicitud
                  </ToggleButton>
                  <ToggleButton value="mejora" sx={{ px: 2.5, fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: '8px !important', ml: 1, '&.Mui-selected': { bgcolor: 'rgba(94,156,122,0.12)', color: 'secondary.main', borderColor: 'secondary.main' } }}>
                    Mejora / Sugerencia
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <TextField label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                fullWidth multiline minRows={4} placeholder="Describe con detalle lo que necesitas..." />

              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Imágenes adjuntas (opcional, máx. 5)
                </Typography>
                {adjuntos.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                    {adjuntos.map((a, i) => (
                      <Chip key={i} label={a.nombre.length > 24 ? `${a.nombre.slice(0, 22)}…` : a.nombre}
                        size="small" icon={<ImageOutlinedIcon />} onDelete={() => setAdjuntos((p) => p.filter((_, j) => j !== i))}
                        deleteIcon={<CloseIcon />} sx={{ fontSize: 11.5, bgcolor: 'rgba(122,107,176,0.08)' }} />
                    ))}
                  </Box>
                )}
                {adjuntos.length < 5 && (
                  <>
                    <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={handleAgregarImagen} id="adjunto-input" />
                    <label htmlFor="adjunto-input">
                      <Button component="span" variant="outlined" size="small" startIcon={<ImageOutlinedIcon />}
                        sx={{ borderStyle: 'dashed', textTransform: 'none', fontSize: 13 }}>
                        Agregar imagen
                      </Button>
                    </label>
                  </>
                )}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 0.5 }}>
                <Button onClick={() => { setMostrarForm(false); setError(null); }} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                  Cancelar
                </Button>
                <Button variant="contained" size="large"
                  endIcon={enviando ? <CircularProgress size={16} color="inherit" /> : <SendOutlinedIcon />}
                  onClick={handleEnviar} disabled={enviando}
                  sx={{ px: 4, fontWeight: 700, textTransform: 'none', fontSize: 14 }}>
                  {enviando ? 'Enviando...' : 'Enviar solicitud'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Historial */}
      <Divider sx={{ mb: 3 }} />
      <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Mis solicitudes
      </Typography>

      {cargandoHistorial ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
      ) : historial.length === 0 ? (
        <Typography sx={{ fontSize: 13.5, color: 'text.disabled', py: 2 }}>Aún no has enviado ninguna solicitud.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#FAF8FD' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary' }}>Título</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary' }}>Fecha</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historial.map((s) => {
                const cfg = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.entregado;
                return (
                  <TableRow key={s.id} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ fontSize: 13 }}>{s.titulo}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{TIPO_LABEL[s.tipo] ?? s.tipo}</TableCell>
                    <TableCell>
                      <Chip label={cfg.label} size="small"
                        sx={{ fontSize: 11.5, fontWeight: 600, color: cfg.color, bgcolor: cfg.bg, border: 'none' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {new Date(s.created_at).toLocaleDateString('es-CL')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}