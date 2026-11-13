import { useState, useEffect } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Paper,
  Table, TableBody, TableCell, TableHead, TableRow,
  Select, MenuItem, type SelectChangeEvent, Tooltip, Divider,
  TextField, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { supabase } from '../lib/supabaseClient';

type EstadoSolicitud = 'entregado' | 'en_progreso' | 'finalizado';

interface SolicitudAdmin {
  id: string;
  created_at: string;
  titulo: string;
  tipo: string;
  descripcion: string;
  estado: EstadoSolicitud;
  usuario_nombre: string | null;
  usuario_correo: string | null;
  usuario_rol: string | null;
}

const ESTADO_CONFIG: Record<EstadoSolicitud, { label: string; color: string; bg: string }> = {
  entregado:   { label: 'Entregado',   color: '#695A9E', bg: 'rgba(122,107,176,0.1)' },
  en_progreso: { label: 'En progreso', color: '#B07D2B', bg: 'rgba(255,180,50,0.12)' },
  finalizado:  { label: 'Finalizado',  color: '#2E7D5E', bg: 'rgba(94,156,122,0.12)' },
};

const TIPO_LABEL: Record<string, string> = {
  solicitud: 'Consulta / Solicitud',
  mejora: 'Mejora / Sugerencia',
};

export default function GestionSolicitudes() {
  const [solicitudes, setSolicitudes] = useState<SolicitudAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitud | 'todos'>('todos');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase
      .from('solicitudes')
      .select('id, created_at, titulo, tipo, descripcion, estado, usuario_nombre, usuario_correo, usuario_rol')
      .order('created_at', { ascending: false });
    setSolicitudes((data as SolicitudAdmin[]) ?? []);
    setCargando(false);
  }

  async function cambiarEstado(id: string, nuevoEstado: EstadoSolicitud) {
    setActualizando(id);
    const { error } = await supabase
      .from('solicitudes')
      .update({ estado: nuevoEstado })
      .eq('id', id);
    if (!error) {
      setSolicitudes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, estado: nuevoEstado } : s))
      );
    }
    setActualizando(null);
  }

  const filtradas = solicitudes.filter((s) => {
    const matchEstado = filtroEstado === 'todos' || s.estado === filtroEstado;
    const q = busqueda.toLowerCase();
    const matchBusqueda =
      !q ||
      s.titulo.toLowerCase().includes(q) ||
      (s.usuario_nombre ?? '').toLowerCase().includes(q) ||
      (s.usuario_correo ?? '').toLowerCase().includes(q);
    return matchEstado && matchBusqueda;
  });

  const conteo = {
    todos: solicitudes.length,
    entregado: solicitudes.filter((s) => s.estado === 'entregado').length,
    en_progreso: solicitudes.filter((s) => s.estado === 'en_progreso').length,
    finalizado: solicitudes.filter((s) => s.estado === 'finalizado').length,
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', py: 4, px: { xs: 2, sm: 3 } }}>
      {/* Encabezado */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Gestión de Solicitudes</Typography>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
          Administra y actualiza el estado de las solicitudes del equipo.
        </Typography>
      </Box>

      {/* Chips resumen */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        {(['todos', 'entregado', 'en_progreso', 'finalizado'] as const).map((e) => {
          const cfg = e === 'todos' ? { label: 'Todas', color: '#4A4060', bg: 'rgba(74,64,96,0.08)' } : ESTADO_CONFIG[e];
          const count = conteo[e];
          return (
            <Chip
              key={e}
              label={`${cfg.label} (${count})`}
              onClick={() => setFiltroEstado(e)}
              variant={filtroEstado === e ? 'filled' : 'outlined'}
              size="small"
              sx={{
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                color: filtroEstado === e ? cfg.color : 'text.secondary',
                bgcolor: filtroEstado === e ? cfg.bg : 'transparent',
                borderColor: filtroEstado === e ? cfg.color : 'divider',
              }}
            />
          );
        })}
      </Box>

      {/* Buscador */}
      <TextField
        size="small" placeholder="Buscar por título, nombre o correo..."
        value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }}
        sx={{ mb: 2.5, width: { xs: '100%', sm: 340 }, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
      />

      <Divider sx={{ mb: 2.5 }} />

      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
      ) : filtradas.length === 0 ? (
        <Typography sx={{ fontSize: 13.5, color: 'text.disabled', py: 3 }}>
          {solicitudes.length === 0 ? 'No hay solicitudes aún.' : 'Sin resultados para los filtros aplicados.'}
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#FAF8FD' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary' }}>Título</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary' }}>Remitente</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary' }}>Fecha</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtradas.map((s) => {
                const cfg = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.entregado;
                return (
                  <TableRow key={s.id} sx={{ '&:last-child td': { border: 0 }, '&:hover': { bgcolor: 'rgba(122,107,176,0.03)' } }}>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Tooltip title={s.descripcion} placement="top-start" arrow>
                        <Typography sx={{ fontSize: 13, fontWeight: 500, cursor: 'default',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                          {s.titulo}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {TIPO_LABEL[s.tipo] ?? s.tipo}
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{s.usuario_nombre ?? '—'}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{s.usuario_rol ?? ''}</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      {actualizando === s.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Select
                          size="small" value={s.estado}
                          onChange={(e: SelectChangeEvent) => cambiarEstado(s.id, e.target.value as EstadoSolicitud)}
                          renderValue={(val) => (
                            <Chip label={ESTADO_CONFIG[val as EstadoSolicitud]?.label ?? val}
                              size="small" sx={{ fontSize: 11.5, fontWeight: 600, height: 22, pointerEvents: 'none',
                                color: cfg.color, bgcolor: cfg.bg }} />
                          )}
                          sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                            '& .MuiSelect-select': { p: '2px 4px' } }}>
                          {Object.entries(ESTADO_CONFIG).map(([key, c]) => (
                            <MenuItem key={key} value={key} sx={{ fontSize: 13 }}>
                              <Chip label={c.label} size="small"
                                sx={{ fontSize: 11.5, fontWeight: 600, color: c.color, bgcolor: c.bg,
                                  pointerEvents: 'none', mr: 1 }} />
                            </MenuItem>
                          ))}
                        </Select>
                      )}
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