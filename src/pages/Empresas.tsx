import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, InputAdornment, Grid, Card, Avatar,
  CircularProgress, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, MenuItem, Select, FormControl, InputLabel, Tooltip,
  Checkbox, Chip, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { supabase } from '../lib/supabaseClient';
import { MONO_FONT } from '../theme/theme';
import { useAuth } from '../context/AuthContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Empresa = {
  id: string;
  empkey: number;
  rut: string;
  razon_social: string;
  nombre_fantasia: string | null;
  completado: boolean;
  estado_empresa: 'activa' | 'caducada' | 'eliminada';
  asignado_a: string | null;
  _contactos: number;
  _usuarios: number;
  _servicios: number;
};

type AgentePerfil = {
  id: string;
  nombre_completo: string | null;
  correo: string | null;
};

type FiltroEtapaValor = 'sin_contactos' | 'sin_usuarios' | 'sin_servicios' | 'listos';
type FiltroEtapa = FiltroEtapaValor | null;

// ─── Helpers visuales ─────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#7A6BB0', '#5E9C7C', '#B79B85', '#5B4E82',
  '#C9A15A', '#8B84A3', '#6B8CA3',
];

function colorParaEmpresa(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function iniciales(nombre: string) { return nombre.slice(0, 2).toUpperCase(); }

function grupoDeEmpresa(e: Empresa): 'borrador' | 'activa' | 'caducada' | 'eliminada' {
  if (!e.completado) return 'borrador';
  return e.estado_empresa;
}

// ─── Barra de 4 segmentos de etapas ──────────────────────────────────────────

const ETAPAS = [
  { key: 'datos',     label: 'Datos',     color: '#7A6BB0' },
  { key: 'contactos', label: 'Contactos', color: '#5E9C7C' },
  { key: 'usuarios',  label: 'Usuarios',  color: '#5B4E82' },
  { key: 'servicios', label: 'Servicios', color: '#B79B85' },
];

function ProgresoEtapas({ empresa }: { empresa: Empresa }) {
  const etapasOk = [
    true,
    empresa._contactos > 0,
    empresa._usuarios > 0,
    empresa._servicios > 0,
  ];
  const completadas = etapasOk.filter(Boolean).length;
  const tooltipTexto = ETAPAS.map((e, i) => `${etapasOk[i] ? '✓' : '○'} ${e.label}`).join('  ');

  return (
    <Tooltip title={tooltipTexto} placement="top" arrow>
      <Box sx={{ mt: 1 }}>
        <Box sx={{ display: 'flex', gap: '2px', height: 4, borderRadius: 999, overflow: 'hidden' }}>
          {ETAPAS.map((etapa, i) => (
            <Box key={etapa.key} sx={{
              flex: 1,
              bgcolor: etapasOk[i] ? etapa.color : '#EAE5F5',
              borderRadius: 999,
              transition: 'background-color 0.2s',
            }} />
          ))}
        </Box>
        <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.4 }}>
          {completadas === 4 ? 'Lista para completar' : `${completadas}/4 etapas`}
        </Typography>
      </Box>
    </Tooltip>
  );
}

// ─── Card empresa ─────────────────────────────────────────────────────────────

function CardEmpresa({
  empresa, onClick, puedeAsignar, esAdmin, agentes,
  onAsignar, onEliminarSuave, onEliminarPermanente,
  seleccionada, onToggleSeleccion, modoSeleccion,
}: {
  empresa: Empresa; onClick: () => void; puedeAsignar: boolean; esAdmin: boolean;
  agentes: AgentePerfil[]; onAsignar: (e: Empresa) => void;
  onEliminarSuave: (e: Empresa) => void; onEliminarPermanente: (e: Empresa) => void;
  seleccionada: boolean; onToggleSeleccion: (e: Empresa) => void; modoSeleccion: boolean;
}) {
  const esBorrador = !empresa.completado;

  return (
    <Card
      onClick={() => modoSeleccion && esBorrador ? onToggleSeleccion(empresa) : onClick()}
      sx={{
        p: 2.2, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 1.5,
        opacity: empresa.estado_empresa !== 'activa' ? 0.7 : 1,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': { borderColor: 'primary.main' },
        ...(seleccionada && { borderColor: 'primary.main', boxShadow: '0 0 0 2px rgba(122,107,176,0.3)' }),
      }}
    >
      {esBorrador && puedeAsignar && (
        <Checkbox size="small" checked={seleccionada}
          onClick={(e) => { e.stopPropagation(); onToggleSeleccion(empresa); }}
          sx={{ p: 0, flexShrink: 0, color: 'text.disabled', '&.Mui-checked': { color: 'primary.main' }, mt: 0.3 }}
        />
      )}
      <Avatar sx={{ bgcolor: colorParaEmpresa(empresa.id), width: 42, height: 42, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
        {iniciales(empresa.nombre_fantasia || empresa.razon_social)}
      </Avatar>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {empresa.razon_social}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.4, alignItems: 'center' }}>
          <Typography sx={{ fontFamily: MONO_FONT, fontSize: 11, color: 'secondary.main', fontWeight: 600 }}>
            {empresa.rut}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>· Empkey {empresa.empkey}</Typography>
        </Box>
        {esBorrador && (
          <>
            <Typography sx={{ fontSize: 10.5, color: empresa.asignado_a ? 'primary.main' : 'text.disabled', mt: 0.3 }}>
              {empresa.asignado_a
                ? `Asignado a ${agentes.find((a) => a.id === empresa.asignado_a)?.nombre_completo ?? agentes.find((a) => a.id === empresa.asignado_a)?.correo ?? '…'}`
                : 'Sin asignar'}
            </Typography>
            <ProgresoEtapas empresa={empresa} />
          </>
        )}
      </Box>
      {esBorrador && !modoSeleccion && (
        <Box sx={{ display: 'flex', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {puedeAsignar && (
            <Tooltip title="Asignar agente">
              <IconButton size="small" onClick={() => onAsignar(empresa)}
                sx={{ color: empresa.asignado_a ? 'primary.main' : 'text.disabled' }}>
                <PersonAddOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Eliminar borrador">
            <IconButton size="small" onClick={() => onEliminarSuave(empresa)}
              sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
              <DeleteOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          {esAdmin && (
            <Tooltip title="Eliminar permanentemente">
              <IconButton size="small" onClick={() => onEliminarPermanente(empresa)}
                sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                <DeleteForeverOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    </Card>
  );
}

// ─── Filtros de etapa ─────────────────────────────────────────────────────────

const FILTROS_ETAPA: { value: FiltroEtapaValor; label: string; color: string }[] = [
  { value: 'sin_contactos', label: 'Sin contactos', color: '#5E9C7C' },
  { value: 'sin_usuarios',  label: 'Sin usuarios',  color: '#5B4E82' },
  { value: 'sin_servicios', label: 'Sin servicios', color: '#B79B85' },
  { value: 'listos',        label: 'Listos ✓',      color: '#7A6BB0' },
];

function aplicarFiltroEtapa(empresas: Empresa[], filtro: FiltroEtapa): Empresa[] {
  if (!filtro) return empresas;
  if (filtro === 'sin_contactos') return empresas.filter((e) => e._contactos === 0);
  if (filtro === 'sin_usuarios')  return empresas.filter((e) => e._usuarios === 0);
  if (filtro === 'sin_servicios') return empresas.filter((e) => e._servicios === 0);
  if (filtro === 'listos')        return empresas.filter((e) => e._contactos > 0 && e._usuarios > 0 && e._servicios > 0);
  return empresas;
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [query, setQuery] = useState('');
  const [soloMias, setSoloMias] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState<FiltroEtapa>(null);
  const [agentes, setAgentes] = useState<AgentePerfil[]>([]);

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [dialogoAsignacionMasiva, setDialogoAsignacionMasiva] = useState(false);
  const [agenteMasivo, setAgenteMasivo] = useState<string>('');
  const [guardandoMasivo, setGuardandoMasivo] = useState(false);

  const [empresaAsignando, setEmpresaAsignando] = useState<Empresa | null>(null);
  const [agenteSel, setAgenteSel] = useState<string>('');
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

  const [empresaEliminandoSuave, setEmpresaEliminandoSuave] = useState<Empresa | null>(null);
  const [procesandoEliminacion, setProcesandoEliminacion] = useState(false);

  const [empresaEliminandoPermanente, setEmpresaEliminandoPermanente] = useState<Empresa | null>(null);
  const [textoConfirmacion, setTextoConfirmacion] = useState('');
  const [procesandoEliminacionPermanente, setProcesandoEliminacionPermanente] = useState(false);

  const navigate = useNavigate();
  const { session, esAdmin, esLider } = useAuth();
  const userId = session?.user.id;

  const puedeAsignar = esAdmin || esLider;
  const puedeVerEliminadas = esAdmin || esLider;
  const modoSeleccion = seleccionadas.size > 0;

  const SECCIONES: { key: 'activa' | 'borrador' | 'caducada' | 'eliminada'; titulo: string; color: string }[] = [
    { key: 'activa',   titulo: 'Activas',   color: '#5E9C7C' },
    { key: 'borrador', titulo: 'Borradores', color: '#C9A15A' },
    { key: 'caducada', titulo: 'Caducadas', color: '#B7791F' },
    ...(puedeVerEliminadas ? [{ key: 'eliminada' as const, titulo: 'Eliminadas', color: '#A85F6A' }] : []),
  ];

  useEffect(() => {
    async function fetchEmpresas() {
      const { data, error } = await supabase
        .from('empresas')
        .select(`
          id, empkey, rut, razon_social, nombre_fantasia, completado, estado_empresa, asignado_a,
          contactos(id),
          usuarios_activos(id),
          empresa_servicios(id)
        `)
        .order('empkey', { ascending: true });

      if (!error && data) {
        const mapeado: Empresa[] = (data as any[]).map((e) => ({
          id: e.id,
          empkey: e.empkey,
          rut: e.rut,
          razon_social: e.razon_social,
          nombre_fantasia: e.nombre_fantasia,
          completado: e.completado,
          estado_empresa: e.estado_empresa,
          asignado_a: e.asignado_a,
          _contactos: Array.isArray(e.contactos) ? e.contactos.length : 0,
          _usuarios: Array.isArray(e.usuarios_activos) ? e.usuarios_activos.length : 0,
          _servicios: Array.isArray(e.empresa_servicios) ? e.empresa_servicios.length : 0,
        }));
        setEmpresas(mapeado);
      }
      setCargando(false);
    }
    fetchEmpresas();
  }, []);

  useEffect(() => {
    if (!puedeAsignar) return;
    async function fetchAgentes() {
      const { data } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, correo')
        .order('nombre_completo', { ascending: true });
      setAgentes(data ?? []);
    }
    fetchAgentes();
  }, [puedeAsignar]);

  const resultados = useMemo(() => {
    let base = empresas;
    if (soloMias && userId) base = base.filter((e) => !e.completado && e.asignado_a === userId);
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(
      (e) =>
        e.rut.toLowerCase().includes(q) ||
        String(e.empkey).includes(q) ||
        e.razon_social.toLowerCase().includes(q) ||
        (e.nombre_fantasia?.toLowerCase().includes(q) ?? false)
    );
  }, [empresas, query, soloMias, userId]);

  // El filtro de etapa se aplica SOLO sobre borradores, no toca activas/caducadas/eliminadas
  const grupos = useMemo(() => {
    const mapa: Record<string, Empresa[]> = { activa: [], borrador: [], caducada: [], eliminada: [] };
    for (const e of resultados) mapa[grupoDeEmpresa(e)].push(e);
    mapa['borrador'] = aplicarFiltroEtapa(mapa['borrador'], filtroEtapa);
    return mapa;
  }, [resultados, filtroEtapa]);

  const borradores = grupos['borrador'] ?? [];
  // Para el conteo del toggle "Mis empresas" usamos resultados sin filtro de etapa
  const misEmpresas = empresas.filter((e) => !e.completado && e.asignado_a === userId);

  function irAEmpresa(empresa: Empresa) {
    navigate(empresa.completado ? `/empresas/${empresa.empkey}` : `/formulario-inscripcion/${empresa.empkey}`);
  }

  function toggleSeleccion(empresa: Empresa) {
    setSeleccionadas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(empresa.id)) nuevo.delete(empresa.id);
      else nuevo.add(empresa.id);
      return nuevo;
    });
  }

  function seleccionarTodosBorradores() { setSeleccionadas(new Set(borradores.map((e) => e.id))); }
  function limpiarSeleccion() { setSeleccionadas(new Set()); }

  async function guardarAsignacionMasiva() {
    if (agenteMasivo === undefined) return;
    setGuardandoMasivo(true);
    const ids = Array.from(seleccionadas);
    const { error } = await supabase.from('empresas').update({ asignado_a: agenteMasivo || null }).in('id', ids);
    setGuardandoMasivo(false);
    if (!error) setEmpresas((prev) => prev.map((e) => ids.includes(e.id) ? { ...e, asignado_a: agenteMasivo || null } : e));
    setDialogoAsignacionMasiva(false);
    setAgenteMasivo('');
    limpiarSeleccion();
  }

  function abrirDialogoAsignacion(empresa: Empresa) {
    setEmpresaAsignando(empresa);
    setAgenteSel(empresa.asignado_a ?? '');
  }

  async function guardarAsignacion() {
    if (!empresaAsignando) return;
    setGuardandoAsignacion(true);
    const { error } = await supabase.from('empresas').update({ asignado_a: agenteSel || null }).eq('id', empresaAsignando.id);
    setGuardandoAsignacion(false);
    if (!error) setEmpresas((prev) => prev.map((e) => e.id === empresaAsignando.id ? { ...e, asignado_a: agenteSel || null } : e));
    setEmpresaAsignando(null);
  }

  async function confirmarEliminacionSuave() {
    if (!empresaEliminandoSuave) return;
    setProcesandoEliminacion(true);
    const { error } = await supabase.from('empresas').update({ estado_empresa: 'eliminada' }).eq('id', empresaEliminandoSuave.id);
    setProcesandoEliminacion(false);
    if (!error) {
      if (puedeVerEliminadas) setEmpresas((prev) => prev.map((e) => e.id === empresaEliminandoSuave.id ? { ...e, estado_empresa: 'eliminada' } : e));
      else setEmpresas((prev) => prev.filter((e) => e.id !== empresaEliminandoSuave.id));
    }
    setEmpresaEliminandoSuave(null);
  }

  async function confirmarEliminacionPermanente() {
    if (!empresaEliminandoPermanente) return;
    setProcesandoEliminacionPermanente(true);
    const { data, error } = await supabase.functions.invoke('permanently-delete-empresa', { body: { empresaId: empresaEliminandoPermanente.id } });
    if (error || data?.error) {
      await supabase.from('empresas').update({ estado_empresa: 'eliminada' }).eq('id', empresaEliminandoPermanente.id);
      const { data: d2, error: e2 } = await supabase.functions.invoke('permanently-delete-empresa', { body: { empresaId: empresaEliminandoPermanente.id } });
      if (e2 || d2?.error) { setProcesandoEliminacionPermanente(false); setEmpresaEliminandoPermanente(null); setTextoConfirmacion(''); return; }
    }
    setProcesandoEliminacionPermanente(false);
    setEmpresas((prev) => prev.filter((e) => e.id !== empresaEliminandoPermanente.id));
    setEmpresaEliminandoPermanente(null);
    setTextoConfirmacion('');
  }

  const nombreAgente = (id: string | null) => {
    if (!id) return null;
    const a = agentes.find((a) => a.id === id);
    return a?.nombre_completo || a?.correo || id;
  };

  // Total de borradores SIN aplicar el filtro de etapa (para mostrar en los chips de filtro)
  const totalBorradoresSinFiltro = useMemo(
    () => resultados.filter((e) => grupoDeEmpresa(e) === 'borrador'),
    [resultados]
  );
  const conteosFiltro = useMemo(() => ({
    sin_contactos: totalBorradoresSinFiltro.filter((e) => e._contactos === 0).length,
    sin_usuarios:  totalBorradoresSinFiltro.filter((e) => e._usuarios === 0).length,
    sin_servicios: totalBorradoresSinFiltro.filter((e) => e._servicios === 0).length,
    listos:        totalBorradoresSinFiltro.filter((e) => e._contactos > 0 && e._usuarios > 0 && e._servicios > 0).length,
  }), [totalBorradoresSinFiltro]);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 4, py: 4 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Empresas</Typography>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        {empresas.length} empresas registradas en Runa
      </Typography>

      {/* Barra de búsqueda + filtro rápido */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Buscar por RUT, Empkey o nombre de empresa"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ maxWidth: 420, flexGrow: 1, bgcolor: 'background.paper' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 19, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <Tooltip title={soloMias ? 'Ver todas las empresas' : 'Ver solo mis borradores asignados'}>
          <ToggleButton
            value="soloMias" selected={soloMias}
            onChange={() => { setSoloMias((v) => !v); limpiarSeleccion(); setFiltroEtapa(null); }}
            size="small"
            sx={{
              gap: 0.8, px: 1.5, fontSize: 12.5, fontWeight: 600, textTransform: 'none',
              borderColor: soloMias ? 'primary.main' : 'divider',
              color: soloMias ? 'primary.main' : 'text.secondary',
              bgcolor: soloMias ? 'rgba(122,107,176,0.08)' : 'background.paper',
              '&.Mui-selected': { bgcolor: 'rgba(122,107,176,0.08)', color: 'primary.main' },
              '&.Mui-selected:hover': { bgcolor: 'rgba(122,107,176,0.12)' },
            }}
          >
            <PersonOutlinedIcon sx={{ fontSize: 17 }} />
            Mis empresas
            {misEmpresas.length > 0 && (
              <Chip label={misEmpresas.length} size="small"
                sx={{ height: 18, fontSize: 10.5, fontWeight: 700, ml: 0.5,
                  bgcolor: soloMias ? 'primary.main' : 'rgba(122,107,176,0.15)',
                  color: soloMias ? '#fff' : 'primary.main' }} />
            )}
          </ToggleButton>
        </Tooltip>
      </Box>

      {/* Barra de asignación masiva */}
      {puedeAsignar && borradores.length > 0 && !soloMias && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          {modoSeleccion ? (
            <>
              <Chip label={`${seleccionadas.size} seleccionada${seleccionadas.size !== 1 ? 's' : ''}`} size="small"
                sx={{ bgcolor: 'rgba(122,107,176,0.12)', color: 'primary.main', fontWeight: 700 }} />
              <Button size="small" startIcon={<GroupAddOutlinedIcon />} variant="contained"
                onClick={() => { setAgenteMasivo(''); setDialogoAsignacionMasiva(true); }}>
                Asignar seleccionadas
              </Button>
              <Button size="small" onClick={seleccionarTodosBorradores} sx={{ color: 'text.secondary' }}>
                Seleccionar todos ({borradores.length})
              </Button>
              <Button size="small" onClick={limpiarSeleccion} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            </>
          ) : (
            <Button size="small" startIcon={<GroupAddOutlinedIcon />} variant="outlined"
              onClick={seleccionarTodosBorradores}
              sx={{ color: 'text.secondary', borderColor: 'divider' }}>
              Asignación masiva
            </Button>
          )}
        </Box>
      )}

      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : soloMias && misEmpresas.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ color: 'text.secondary' }}>No tienes borradores asignados.</Typography>
        </Box>
      ) : resultados.length === 0 ? (
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 8 }}>
          No se encontraron empresas para "{query}"
        </Typography>
      ) : (
        SECCIONES.map(({ key, titulo, color }) => {
          const items = grupos[key];
          const esBorrador = key === 'borrador';

          // Para borradores usamos el total SIN filtro de etapa para el encabezado
          const totalParaTitulo = esBorrador ? totalBorradoresSinFiltro.length : items.length;
          if (!esBorrador && items.length === 0) return null;

          return (
            <Box key={key} sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '999px', bgcolor: color, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {titulo} ({totalParaTitulo})
                </Typography>

                {/* Filtros de etapa — solo en sección Borradores */}
                {esBorrador && totalParaTitulo > 0 && (
                  <ToggleButtonGroup
                    value={filtroEtapa ?? ''}
                    exclusive
                    onChange={(_, v: FiltroEtapaValor | null) => { setFiltroEtapa(v); limpiarSeleccion(); }}
                    size="small"
                    sx={{ ml: 1, flexWrap: 'wrap', gap: 0.5, '& .MuiToggleButtonGroup-grouped': { border: '1px solid', borderRadius: '6px !important', mx: 0 } }}
                  >
                    {FILTROS_ETAPA.map((f) => {
                      const conteo = conteosFiltro[f.value as keyof typeof conteosFiltro];
                      const activo = filtroEtapa === f.value;
                      return (
                        <ToggleButton
                          key={f.value} value={f.value}
                          sx={{
                            px: 1.2, py: 0.3, fontSize: 11, fontWeight: 600, textTransform: 'none',
                            borderColor: activo ? f.color : 'divider',
                            color: activo ? f.color : 'text.disabled',
                            bgcolor: activo ? `${f.color}12` : 'background.paper',
                            '&.Mui-selected': { bgcolor: `${f.color}12`, color: f.color, borderColor: f.color },
                            '&.Mui-selected:hover': { bgcolor: `${f.color}20` },
                          }}
                        >
                          {f.label}
                          <Box component="span" sx={{
                            ml: 0.6, px: 0.7, py: 0.1, borderRadius: '999px', fontSize: 10, fontWeight: 700,
                            bgcolor: activo ? `${f.color}20` : 'rgba(0,0,0,0.05)',
                            color: activo ? f.color : 'text.disabled',
                          }}>
                            {conteo}
                          </Box>
                        </ToggleButton>
                      );
                    })}
                  </ToggleButtonGroup>
                )}

                {/* Chip indicando que hay filtro activo */}
                {esBorrador && filtroEtapa && (
                  <Chip
                    label={`${items.length} resultado${items.length !== 1 ? 's' : ''}`}
                    size="small"
                    onDelete={() => setFiltroEtapa(null)}
                    sx={{ fontSize: 11, height: 20, bgcolor: 'rgba(122,107,176,0.10)', color: 'primary.main' }}
                  />
                )}
              </Box>

              {esBorrador && items.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: 'text.disabled', py: 2 }}>
                  No hay borradores en esta etapa.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {items.map((empresa) => (
                    <Grid key={empresa.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <CardEmpresa
                        empresa={empresa} onClick={() => irAEmpresa(empresa)}
                        puedeAsignar={puedeAsignar} esAdmin={esAdmin} agentes={agentes}
                        onAsignar={abrirDialogoAsignacion}
                        onEliminarSuave={setEmpresaEliminandoSuave}
                        onEliminarPermanente={(e) => { setEmpresaEliminandoPermanente(e); setTextoConfirmacion(''); }}
                        seleccionada={seleccionadas.has(empresa.id)}
                        onToggleSeleccion={toggleSeleccion}
                        modoSeleccion={modoSeleccion}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          );
        })
      )}

      {/* ── Diálogos ── */}

      <Dialog open={dialogoAsignacionMasiva} onClose={() => setDialogoAsignacionMasiva(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>
          Asignar agente a {seleccionadas.size} empresa{seleccionadas.size !== 1 ? 's' : ''}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
            Todas las empresas seleccionadas quedarán asignadas al mismo agente.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Asignar a</InputLabel>
            <Select value={agenteMasivo} label="Asignar a" onChange={(e) => setAgenteMasivo(e.target.value)}>
              <MenuItem value=""><em>Sin asignar</em></MenuItem>
              {agentes.map((a) => <MenuItem key={a.id} value={a.id}>{a.nombre_completo || a.correo}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogoAsignacionMasiva(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={guardarAsignacionMasiva} disabled={guardandoMasivo} variant="contained">
            {guardandoMasivo ? 'Asignando...' : 'Confirmar asignación'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!empresaAsignando} onClose={() => setEmpresaAsignando(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Asignar agente</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
            Elige quién estará a cargo de completar el registro de <strong>{empresaAsignando?.razon_social}</strong>.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Asignar a</InputLabel>
            <Select value={agenteSel} label="Asignar a" onChange={(e) => setAgenteSel(e.target.value)}>
              <MenuItem value=""><em>Sin asignar</em></MenuItem>
              {agentes.map((a) => <MenuItem key={a.id} value={a.id}>{a.nombre_completo || a.correo}</MenuItem>)}
            </Select>
          </FormControl>
          {empresaAsignando?.asignado_a && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1 }}>
              Actualmente: {nombreAgente(empresaAsignando.asignado_a)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEmpresaAsignando(null)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={guardarAsignacion} disabled={guardandoAsignacion} variant="contained">
            {guardandoAsignacion ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!empresaEliminandoSuave} onClose={() => setEmpresaEliminandoSuave(null)}>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>¿Eliminar este borrador?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            <strong>{empresaEliminandoSuave?.razon_social}</strong> pasará a estado eliminada. Es reversible — un administrador puede reactivarla desde la ficha.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEmpresaEliminandoSuave(null)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={confirmarEliminacionSuave} disabled={procesandoEliminacion} variant="contained" color="error">
            {procesandoEliminacion ? 'Eliminando...' : 'Sí, eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!empresaEliminandoPermanente} onClose={() => setEmpresaEliminandoPermanente(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: 'error.main' }}>⚠️ Eliminar permanentemente</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 2 }}>
            Esta acción es <strong>irreversible</strong>. Se enviará un respaldo por correo a los admins antes de borrar.
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
            Escribe <strong>{empresaEliminandoPermanente?.razon_social}</strong> para confirmar:
          </Typography>
          <TextField fullWidth size="small" autoFocus value={textoConfirmacion}
            onChange={(e) => setTextoConfirmacion(e.target.value)}
            placeholder={empresaEliminandoPermanente?.razon_social} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEmpresaEliminandoPermanente(null)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={confirmarEliminacionPermanente}
            disabled={procesandoEliminacionPermanente || textoConfirmacion.trim() !== empresaEliminandoPermanente?.razon_social}
            variant="contained" color="error">
            {procesandoEliminacionPermanente ? 'Eliminando...' : 'Eliminar permanentemente'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}