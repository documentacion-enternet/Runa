import { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Card, CircularProgress, Chip, Avatar,
  TextField, InputAdornment, MenuItem, Divider, Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { MONO_FONT } from '../theme/theme';

type EntradaLog = {
  id: string;
  empresa_id: string;
  seccion: string;
  descripcion: string;
  created_at: string;
  empresa: { empkey: number; razon_social: string } | null;
  perfil: { nombre_completo: string | null; correo: string | null } | null;
};

const COLOR_SECCION: Record<string, string> = {
  datos: '#7A6BB0',
  representantes: '#5B4E82',
  contactos: '#5E9C7C',
  usuarios: '#C9A15A',
  servicios: '#B79B85',
};

const LABEL_SECCION: Record<string, string> = {
  datos: 'Datos',
  representantes: 'Representantes',
  contactos: 'Contactos',
  usuarios: 'Usuarios',
  servicios: 'Servicios',
};

function formatearFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function iniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
}

export default function HistorialBorradores() {
  const navigate = useNavigate();
  const [log, setLog] = useState<EntradaLog[]>([]);
  const [cargando, setCargando] = useState(true);
  const [query, setQuery] = useState('');
  const [filtroSeccion, setFiltroSeccion] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');

  useEffect(() => {
    async function cargar() {
      // Traer todo el historial directamente (RLS limita a admin/lider)
      const { data: historialData, error } = await supabase
        .from('empresa_historial')
        .select('id, empresa_id, usuario_id, seccion, descripcion, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) { console.error('Error historial:', error); setCargando(false); return; }
      if (!historialData || historialData.length === 0) { setCargando(false); return; }

      // IDs únicos de empresas que aparecen en el historial (pocos — solo las que tienen cambios)
      const empresaIds = [...new Set(historialData.map((h: any) => h.empresa_id))];

      // Traer esas empresas y quedarse solo con las que son borradores activos
      const { data: empresasData } = await supabase
        .from('empresas')
        .select('id, empkey, razon_social, completado, estado_empresa')
        .in('id', empresaIds);

      const mapaBorradores = new Map(
        (empresasData ?? [])
          .filter((e: any) => e.completado === false && e.estado_empresa !== 'eliminada')
          .map((e: any) => [e.id, { empkey: e.empkey, razon_social: e.razon_social }])
      );

      // Resolver perfiles de usuario
      const usuarioIds = [...new Set(historialData.map((h: any) => h.usuario_id).filter(Boolean))];
      const mapaPerfiles = new Map<string, { nombre_completo: string | null; correo: string | null }>();
      if (usuarioIds.length > 0) {
        const { data: perfilesData } = await supabase
          .from('perfiles')
          .select('id, nombre_completo, correo')
          .in('id', usuarioIds);
        (perfilesData ?? []).forEach((p: any) => mapaPerfiles.set(p.id, p));
      }

      // Filtrar solo entradas de borradores y ensamblar
      const enriquecido: EntradaLog[] = historialData
        .filter((h: any) => mapaBorradores.has(h.empresa_id))
        .map((h: any) => ({
          id: h.id,
          empresa_id: h.empresa_id,
          seccion: h.seccion,
          descripcion: h.descripcion,
          created_at: h.created_at,
          empresa: mapaBorradores.get(h.empresa_id) ?? null,
          perfil: h.usuario_id ? (mapaPerfiles.get(h.usuario_id) ?? null) : null,
        }));

      setLog(enriquecido);
      setCargando(false);
    }
    cargar();
  }, []);

  const usuariosUnicos = useMemo(() => {
    const mapa = new Map<string, string>();
    log.forEach(e => {
      const nombre = e.perfil?.nombre_completo || e.perfil?.correo || '';
      if (nombre) mapa.set(nombre, nombre);
    });
    return Array.from(mapa.keys()).sort();
  }, [log]);

  const resultados = useMemo(() => {
    return log.filter(e => {
      const nombre = e.perfil?.nombre_completo || e.perfil?.correo || '';
      const empresa = e.empresa?.razon_social || '';
      const empkey = String(e.empresa?.empkey || '');
      const q = query.toLowerCase();

      if (q && !empresa.toLowerCase().includes(q) && !empkey.includes(q) && !nombre.toLowerCase().includes(q)) return false;
      if (filtroSeccion && e.seccion !== filtroSeccion) return false;
      if (filtroUsuario && nombre !== filtroUsuario) return false;
      return true;
    });
  }, [log, query, filtroSeccion, filtroUsuario]);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 4, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <HistoryOutlinedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
        <Typography variant="h5">Auditoría de borradores</Typography>
      </Box>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Log de todos los cambios realizados en empresas en estado borrador
      </Typography>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Buscar empresa, Empkey o usuario"
          value={query}
          onChange={e => setQuery(e.target.value)}
          size="small"
          sx={{ minWidth: 260, flexGrow: 1, bgcolor: 'background.paper' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select size="small" label="Sección" value={filtroSeccion}
          onChange={e => setFiltroSeccion(e.target.value)}
          sx={{ minWidth: 150, bgcolor: 'background.paper' }}
        >
          <MenuItem value="">Todas</MenuItem>
          {Object.entries(LABEL_SECCION).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" label="Usuario" value={filtroUsuario}
          onChange={e => setFiltroUsuario(e.target.value)}
          sx={{ minWidth: 180, bgcolor: 'background.paper' }}
        >
          <MenuItem value="">Todos</MenuItem>
          {usuariosUnicos.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
        </TextField>
        {(query || filtroSeccion || filtroUsuario) && (
          <Button size="small" onClick={() => { setQuery(''); setFiltroSeccion(''); setFiltroUsuario(''); }}
            sx={{ color: 'text.disabled', textTransform: 'none' }}>
            Limpiar filtros
          </Button>
        )}
      </Box>

      {/* Contador */}
      {!cargando && (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>
          {resultados.length} {resultados.length === 1 ? 'evento' : 'eventos'}
          {(query || filtroSeccion || filtroUsuario) ? ' (filtrado)' : ''}
          {' '}· {log.length} total
        </Typography>
      )}

      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : resultados.length === 0 ? (
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 8 }}>
          {log.length === 0 ? 'Aún no hay cambios registrados en borradores.' : 'Sin resultados para los filtros aplicados.'}
        </Typography>
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          {resultados.map((entrada, idx) => {
            const color = COLOR_SECCION[entrada.seccion] ?? '#8B84A3';
            const nombre = entrada.perfil?.nombre_completo || entrada.perfil?.correo || 'Usuario desconocido';
            const empresa = entrada.empresa?.razon_social ?? '—';
            const empkey = entrada.empresa?.empkey;

            return (
              <Box key={entrada.id}>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr auto',
                  alignItems: 'center',
                  gap: 2,
                  px: 2.5, py: 1.8,
                  '&:hover': { bgcolor: 'rgba(122,107,176,0.03)' },
                }}>
                  {/* Avatar usuario */}
                  <Avatar sx={{ width: 34, height: 34, fontSize: 11, fontWeight: 700, bgcolor: 'primary.main' }}>
                    {iniciales(nombre)}
                  </Avatar>

                  {/* Info principal */}
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.3 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{nombre}</Typography>
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{entrada.descripcion}</Typography>
                      <Chip
                        label={LABEL_SECCION[entrada.seccion] ?? entrada.seccion}
                        size="small"
                        sx={{ fontSize: 10, height: 16, fontWeight: 700, bgcolor: `${color}15`, color }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        onClick={() => empkey && navigate(`/formulario-inscripcion/${empkey}`)}
                        sx={{
                          fontSize: 12, color: 'primary.main', fontWeight: 600,
                          cursor: 'pointer', '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {empresa}
                      </Typography>
                      {empkey && (
                        <Typography sx={{ fontSize: 11, color: 'text.disabled', fontFamily: MONO_FONT }}>
                          Empkey {empkey}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Fecha */}
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', whiteSpace: 'nowrap', fontFamily: MONO_FONT }}>
                    {formatearFecha(entrada.created_at)}
                  </Typography>
                </Box>
                {idx < resultados.length - 1 && <Divider />}
              </Box>
            );
          })}
        </Card>
      )}
    </Box>
  );
}