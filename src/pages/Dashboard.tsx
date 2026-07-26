import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Grid, CircularProgress, Chip,
  TextField, MenuItem, Divider, Avatar, LinearProgress,
} from '@mui/material';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import { supabase } from '../lib/supabaseClient';
import { MONO_FONT } from '../theme/theme';

type EmpresaRaw = {
  id: string;
  estado_empresa: 'activa' | 'caducada' | 'eliminada';
  completado: boolean;
  asignado_a: string | null;
  creado_en: string;
  completado_en: string | null;
  completado_por: string | null;
};

type Agente = {
  id: string;
  nombre_completo: string | null;
  correo: string | null;
  rol: string;
};

type StatsAgente = {
  agente: Agente;
  asignadas: number;       // borradores asignados a él
  completadas: number;     // empresas completadas por él
  pendientes: number;      // asignadas pero aún borrador
};

const RANGOS = [
  { label: 'Todo el tiempo', value: 'all' },
  { label: 'Últimos 7 días', value: '7d' },
  { label: 'Últimos 30 días', value: '30d' },
  { label: 'Últimos 90 días', value: '90d' },
  { label: 'Este año', value: 'year' },
];

function fechaDesde(rango: string): string | null {
  const ahora = new Date();
  if (rango === '7d') { ahora.setDate(ahora.getDate() - 7); return ahora.toISOString(); }
  if (rango === '30d') { ahora.setDate(ahora.getDate() - 30); return ahora.toISOString(); }
  if (rango === '90d') { ahora.setDate(ahora.getDate() - 90); return ahora.toISOString(); }
  if (rango === 'year') { ahora.setMonth(0, 1); ahora.setHours(0, 0, 0, 0); return ahora.toISOString(); }
  return null;
}

function KpiCard({
  titulo, valor, icono, color, subtitulo,
}: {
  titulo: string; valor: number; icono: React.ReactNode; color: string; subtitulo?: string;
}) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ color, fontSize: 20, display: 'flex' }}>{icono}</Box>
        </Box>
        <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary', fontFamily: MONO_FONT }}>
          {valor}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary' }}>{titulo}</Typography>
      {subtitulo && <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.3 }}>{subtitulo}</Typography>}
    </Card>
  );
}

function BarraProgreso({ valor, total, color }: { valor: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((valor / total) * 100);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          flexGrow: 1, height: 6, borderRadius: 999,
          bgcolor: '#EAE5F5',
          '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: color },
        }}
      />
      <Typography sx={{ fontSize: 11, color: 'text.disabled', minWidth: 32, textAlign: 'right', fontFamily: MONO_FONT }}>
        {pct}%
      </Typography>
    </Box>
  );
}

export default function Dashboard() {
  const [cargando, setCargando] = useState(true);
  const [rango, setRango] = useState('all');
  const [empresas, setEmpresas] = useState<EmpresaRaw[]>([]);
  const [agentes, setAgentes] = useState<Agente[]>([]);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const desde = fechaDesde(rango);

      // Traer todas las empresas (admin ve todo por RLS)
      let query = supabase
        .from('empresas')
        .select('id, estado_empresa, completado, asignado_a, creado_en:created_at, completado_en, completado_por');

      if (desde) query = query.gte('created_at', desde);

      const { data: empData } = await query;
      setEmpresas((empData as EmpresaRaw[]) ?? []);

      // Traer agentes y líderes (quienes pueden completar empresas)
      const { data: agentesData } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, correo, rol')
        .in('rol', ['agente', 'lider'])
        .order('nombre_completo', { ascending: true });

      setAgentes((agentesData as Agente[]) ?? []);
      setCargando(false);
    }
    cargar();
  }, [rango]);

  // --- Cálculos ---
  const total = empresas.length;
  const activas = empresas.filter((e) => e.completado && e.estado_empresa === 'activa').length;
  const caducadas = empresas.filter((e) => e.completado && e.estado_empresa === 'caducada').length;
  const eliminadas = empresas.filter((e) => e.estado_empresa === 'eliminada').length;
  const borradores = empresas.filter((e) => !e.completado).length;
  const borradoresSinAsignar = empresas.filter((e) => !e.completado && !e.asignado_a).length;
  const borradoresAsignados = empresas.filter((e) => !e.completado && e.asignado_a).length;

  const statsAgentes: StatsAgente[] = agentes.map((agente) => {
    const asignadas = empresas.filter((e) => !e.completado && e.asignado_a === agente.id).length;
    const completadas = empresas.filter((e) => e.completado && e.completado_por === agente.id).length;
    const pendientes = asignadas; // borradores asignados a él aún no completados
    return { agente, asignadas, completadas, pendientes };
  }).sort((a, b) => b.completadas - a.completadas);

  const maxCompletadas = Math.max(...statsAgentes.map((s) => s.completadas), 1);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 4, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.3 }}>Dashboard</Typography>
          <Typography variant="subtitle1">Resumen del estado de Runa</Typography>
        </Box>
        <TextField
          select size="small" value={rango}
          onChange={(e) => setRango(e.target.value)}
          sx={{ minWidth: 180, bgcolor: 'background.paper' }}
          label="Período"
        >
          {RANGOS.map((r) => (
            <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
          ))}
        </TextField>
      </Box>

      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : (
        <>
          {/* KPIs generales */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1.5 }}>
            Resumen general
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard titulo="Total empresas" valor={total} color="#7A6BB0" icono={<BusinessOutlinedIcon fontSize="inherit" />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard titulo="Activas" valor={activas} color="#5E9C7C" icono={<CheckCircleOutlineIcon fontSize="inherit" />} subtitulo={`${total > 0 ? Math.round((activas / total) * 100) : 0}% del total`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard titulo="Caducadas" valor={caducadas} color="#C9A15A" icono={<EventBusyOutlinedIcon fontSize="inherit" />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard titulo="Eliminadas" valor={eliminadas} color="#A85F6A" icono={<DeleteOutlineIcon fontSize="inherit" />} />
            </Grid>
          </Grid>

          {/* Borradores */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1.5 }}>
            Borradores
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <KpiCard titulo="Total borradores" valor={borradores} color="#B79B85" icono={<EditNoteOutlinedIcon fontSize="inherit" />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <KpiCard
                titulo="Asignados"
                valor={borradoresAsignados}
                color="#7A6BB0"
                icono={<AssignmentIndOutlinedIcon fontSize="inherit" />}
                subtitulo={`${borradores > 0 ? Math.round((borradoresAsignados / borradores) * 100) : 0}% de los borradores`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <KpiCard
                titulo="Sin asignar"
                valor={borradoresSinAsignar}
                color="#C9A15A"
                icono={<HourglassEmptyOutlinedIcon fontSize="inherit" />}
                subtitulo={borradoresSinAsignar > 0 ? 'Pendientes de asignar' : 'Todo asignado ✓'}
              />
            </Grid>
          </Grid>

          {/* Por agente */}
          {statsAgentes.length > 0 && (
            <>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1.5 }}>
                Por agente
              </Typography>
              <Card sx={{ overflow: 'hidden' }}>
                {/* Header */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 180px', px: 2.5, py: 1, bgcolor: '#FAF8FD', borderBottom: '1px solid #EAE5F5' }}>
                  {['Agente', 'Asignadas', 'Completadas', 'Pendientes', 'Progreso'].map((h) => (
                    <Typography key={h} sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {h}
                    </Typography>
                  ))}
                </Box>
                {statsAgentes.map((s, i) => (
                  <Box key={s.agente.id}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 180px', px: 2.5, py: 1.6, alignItems: 'center' }}>
                      {/* Agente */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 11, fontWeight: 700 }}>
                          {(s.agente.nombre_completo || s.agente.correo || '?').slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.agente.nombre_completo || s.agente.correo}
                          </Typography>
                          <Chip
                            label={s.agente.rol === 'lider' ? 'Líder' : 'Agente'}
                            size="small"
                            sx={{
                              height: 16, fontSize: 9.5, fontWeight: 700,
                              bgcolor: s.agente.rol === 'lider' ? 'rgba(91,78,130,0.12)' : 'rgba(94,156,122,0.12)',
                              color: s.agente.rol === 'lider' ? '#5B4E82' : '#4C8467',
                            }}
                          />
                        </Box>
                      </Box>
                      {/* Asignadas */}
                      <Typography sx={{ fontFamily: MONO_FONT, fontSize: 13.5, fontWeight: 700, color: s.asignadas > 0 ? 'primary.main' : 'text.disabled' }}>
                        {s.asignadas}
                      </Typography>
                      {/* Completadas */}
                      <Typography sx={{ fontFamily: MONO_FONT, fontSize: 13.5, fontWeight: 700, color: s.completadas > 0 ? 'secondary.main' : 'text.disabled' }}>
                        {s.completadas}
                      </Typography>
                      {/* Pendientes */}
                      <Typography sx={{ fontFamily: MONO_FONT, fontSize: 13.5, fontWeight: 700, color: s.pendientes > 0 ? '#C9A15A' : 'text.disabled' }}>
                        {s.pendientes}
                      </Typography>
                      {/* Barra de progreso relativa al que más completó */}
                      <BarraProgreso valor={s.completadas} total={maxCompletadas} color="#5E9C7C" />
                    </Box>
                    {i < statsAgentes.length - 1 && <Divider />}
                  </Box>
                ))}
                {statsAgentes.every((s) => s.completadas === 0 && s.asignadas === 0) && (
                  <Typography sx={{ fontSize: 13, color: 'text.disabled', textAlign: 'center', py: 4 }}>
                    Sin actividad en el período seleccionado.
                  </Typography>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </Box>
  );
}