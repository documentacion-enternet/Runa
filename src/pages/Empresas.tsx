import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, InputAdornment, Grid, Card, Avatar,
  CircularProgress, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, MenuItem, Select, FormControl, InputLabel, Tooltip,
  Checkbox, Chip, ToggleButton,
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

type Empresa = {
  id: string;
  empkey: number;
  rut: string;
  razon_social: string;
  nombre_fantasia: string | null;
  completado: boolean;
  estado_empresa: 'activa' | 'caducada' | 'eliminada';
  asignado_a: string | null;
};

type AgentePerfil = {
  id: string;
  nombre_completo: string | null;
  correo: string | null;
};

const AVATAR_COLORS = [
  '#7A6BB0', '#5E9C7C', '#B79B85', '#5B4E82',
  '#C9A15A', '#8B84A3', '#6B8CA3',
];

function colorParaEmpresa(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function iniciales(nombre: string) {
  return nombre.slice(0, 2).toUpperCase();
}

function grupoDeEmpresa(e: Empresa): 'borrador' | 'activa' | 'caducada' | 'eliminada' {
  if (!e.completado) return 'borrador';
  return e.estado_empresa;
}

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
        p: 2.2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
        opacity: empresa.estado_empresa !== 'activa' ? 0.7 : 1,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': { borderColor: 'primary.main' },
        ...(seleccionada && { borderColor: 'primary.main', boxShadow: '0 0 0 2px rgba(122,107,176,0.3)' }),
      }}
    >
      {esBorrador && puedeAsignar && (
        <Checkbox
          size="small" checked={seleccionada}
          onClick={(e) => { e.stopPropagation(); onToggleSeleccion(empresa); }}
          sx={{ p: 0, flexShrink: 0, color: 'text.disabled', '&.Mui-checked': { color: 'primary.main' } }}
        />
      )}
      <Avatar sx={{ bgcolor: colorParaEmpresa(empresa.id), width: 42, height: 42, fontWeight: 700, fontSize: 14 }}>
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
          <Typography sx={{ fontSize: 10.5, color: empresa.asignado_a ? 'primary.main' : 'text.disabled', mt: 0.3 }}>
            {empresa.asignado_a
              ? `Asignado a ${agentes.find((a) => a.id === empresa.asignado_a)?.nombre_completo ?? agentes.find((a) => a.id === empresa.asignado_a)?.correo ?? '…'}`
              : 'Sin asignar'}
          </Typography>
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

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [query, setQuery] = useState('');
  const [soloMias, setSoloMias] = useState(false);
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
    { key: 'activa', titulo: 'Activas', color: '#5E9C7C' },
    { key: 'borrador', titulo: 'Borradores', color: '#C9A15A' },
    { key: 'caducada', titulo: 'Caducadas', color: '#B7791F' },
    ...(puedeVerEliminadas ? [{ key: 'eliminada' as const, titulo: 'Eliminadas', color: '#A85F6A' }] : []),
  ];

  useEffect(() => {
    async function fetchEmpresas() {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, empkey, rut, razon_social, nombre_fantasia, completado, estado_empresa, asignado_a')
        .order('empkey', { ascending: true });
      if (!error && data) setEmpresas(data);
      setCargando(false);
    }
    fetchEmpresas();
  }, []);

  useEffect(() => {
    if (!puedeAsignar) return;
    async function fetchAgentes() {
      // Incluir todos los roles para que admin/lider también puedan asignarse empresas a sí mismos
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
    // Filtro "solo las mías": borradores asignados al usuario logueado
    if (soloMias && userId) {
      base = base.filter((e) => !e.completado && e.asignado_a === userId);
    }
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

  const grupos = useMemo(() => {
    const mapa: Record<string, Empresa[]> = { activa: [], borrador: [], caducada: [], eliminada: [] };
    for (const e of resultados) mapa[grupoDeEmpresa(e)].push(e);
    return mapa;
  }, [resultados]);

  const borradores = grupos['borrador'] ?? [];
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

  function seleccionarTodosBorradores() {
    setSeleccionadas(new Set(borradores.map((e) => e.id)));
  }

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
        {/* Filtro rápido "Solo las mías" */}
        <Tooltip title={soloMias ? 'Ver todas las empresas' : 'Ver solo mis borradores asignados'}>
          <ToggleButton
            value="soloMias"
            selected={soloMias}
            onChange={() => { setSoloMias((v) => !v); limpiarSeleccion(); }}
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
              <Chip
                label={misEmpresas.length}
                size="small"
                sx={{ height: 18, fontSize: 10.5, fontWeight: 700, ml: 0.5,
                  bgcolor: soloMias ? 'primary.main' : 'rgba(122,107,176,0.15)',
                  color: soloMias ? '#fff' : 'primary.main' }}
              />
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
          if (items.length === 0) return null;
          return (
            <Box key={key} sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '999px', bgcolor: color }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {titulo} ({items.length})
                </Typography>
              </Box>
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
            </Box>
          );
        })
      )}

      {/* Diálogo: Asignación masiva */}
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
              {agentes.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.nombre_completo || a.correo}</MenuItem>
              ))}
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

      {/* Diálogo: Asignar individual */}
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
              {agentes.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.nombre_completo || a.correo}</MenuItem>
              ))}
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

      {/* Diálogo: Eliminar suave */}
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

      {/* Diálogo: Eliminar permanente */}
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
          <Button
            onClick={confirmarEliminacionPermanente}
            disabled={procesandoEliminacionPermanente || textoConfirmacion.trim() !== empresaEliminandoPermanente?.razon_social}
            variant="contained" color="error">
            {procesandoEliminacionPermanente ? 'Eliminando...' : 'Eliminar permanentemente'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}