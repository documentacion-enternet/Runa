import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, InputAdornment, Grid, Card, Avatar,
  CircularProgress, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, MenuItem, Select, FormControl, InputLabel, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
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
  empresa,
  onClick,
  puedeAsignar,
  agentes,
  onAsignar,
}: {
  empresa: Empresa;
  onClick: () => void;
  puedeAsignar: boolean;
  agentes: AgentePerfil[];
  onAsignar: (empresa: Empresa) => void;
}) {
  const esBorrador = !empresa.completado;

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2.2,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        opacity: empresa.estado_empresa !== 'activa' ? 0.7 : 1,
        transition: 'border-color 0.15s',
        '&:hover': { borderColor: 'primary.main' },
        position: 'relative',
      }}
    >
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
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
            · Empkey {empresa.empkey}
          </Typography>
        </Box>
        {/* Indicador de asignación en borradores */}
        {esBorrador && (
          <Typography sx={{ fontSize: 10.5, color: empresa.asignado_a ? 'primary.main' : 'text.disabled', mt: 0.3 }}>
            {empresa.asignado_a
              ? `Asignado a ${agentes.find((a) => a.id === empresa.asignado_a)?.nombre_completo ?? agentes.find((a) => a.id === empresa.asignado_a)?.correo ?? '…'}`
              : 'Sin asignar'}
          </Typography>
        )}
      </Box>

      {/* Botón de asignación — solo en borradores y para admin/lider */}
      {esBorrador && puedeAsignar && (
        <Tooltip title="Asignar agente">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onAsignar(empresa); }}
            sx={{ color: empresa.asignado_a ? 'primary.main' : 'text.disabled', flexShrink: 0 }}
          >
            <PersonAddOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
    </Card>
  );
}

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [query, setQuery] = useState('');
  const [agentes, setAgentes] = useState<AgentePerfil[]>([]);
  const [empresaAsignando, setEmpresaAsignando] = useState<Empresa | null>(null);
  const [agenteSel, setAgenteSel] = useState<string>('');
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);
  const navigate = useNavigate();
  const { esAdmin, esLider } = useAuth();

  const puedeAsignar = esAdmin || esLider;
  // Lider y admin ven eliminadas; agente y vista no (RLS ya filtra, esto es para la UI)
  const puedeVerEliminadas = esAdmin || esLider;

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
      const { data } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, correo')
        .in('rol', ['agente', 'vista'])
        .order('nombre_completo', { ascending: true });
      setAgentes(data ?? []);
    }
    fetchAgentes();
  }, [puedeAsignar]);

  const resultados = useMemo(() => {
    if (!query.trim()) return empresas;
    const q = query.toLowerCase();
    return empresas.filter(
      (e) =>
        e.rut.toLowerCase().includes(q) ||
        String(e.empkey).includes(q) ||
        e.razon_social.toLowerCase().includes(q) ||
        (e.nombre_fantasia?.toLowerCase().includes(q) ?? false)
    );
  }, [empresas, query]);

  const grupos = useMemo(() => {
    const mapa: Record<string, Empresa[]> = { activa: [], borrador: [], caducada: [], eliminada: [] };
    for (const e of resultados) mapa[grupoDeEmpresa(e)].push(e);
    return mapa;
  }, [resultados]);

  function irAEmpresa(empresa: Empresa) {
    navigate(empresa.completado ? `/empresas/${empresa.empkey}` : `/formulario-inscripcion/${empresa.empkey}`);
  }

  function abrirDialogoAsignacion(empresa: Empresa) {
    setEmpresaAsignando(empresa);
    setAgenteSel(empresa.asignado_a ?? '');
  }

  async function guardarAsignacion() {
    if (!empresaAsignando) return;
    setGuardandoAsignacion(true);
    const { error } = await supabase
      .from('empresas')
      .update({ asignado_a: agenteSel || null })
      .eq('id', empresaAsignando.id);
    setGuardandoAsignacion(false);

    if (!error) {
      setEmpresas((prev) =>
        prev.map((e) => e.id === empresaAsignando.id ? { ...e, asignado_a: agenteSel || null } : e)
      );
    }
    setEmpresaAsignando(null);
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

      <TextField
        fullWidth
        placeholder="Buscar por RUT, Empkey o nombre de empresa"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 4, maxWidth: 480, bgcolor: 'background.paper' }}
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

      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
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
                      empresa={empresa}
                      onClick={() => irAEmpresa(empresa)}
                      puedeAsignar={puedeAsignar}
                      agentes={agentes}
                      onAsignar={abrirDialogoAsignacion}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          );
        })
      )}

      {/* Diálogo: Asignar agente a borrador */}
      <Dialog open={!!empresaAsignando} onClose={() => setEmpresaAsignando(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Asignar agente</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
            Elige quién estará a cargo de completar el registro de{' '}
            <strong>{empresaAsignando?.razon_social}</strong>.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Agente asignado</InputLabel>
            <Select
              value={agenteSel}
              label="Agente asignado"
              onChange={(e) => setAgenteSel(e.target.value)}
            >
              <MenuItem value=""><em>Sin asignar</em></MenuItem>
              {agentes.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.nombre_completo || a.correo}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {empresaAsignando?.asignado_a && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1 }}>
              Actualmente asignado a: {nombreAgente(empresaAsignando.asignado_a)}
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
    </Box>
  );
}