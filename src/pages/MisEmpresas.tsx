import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, Avatar, CircularProgress, Chip,
} from '@mui/material';
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

export default function MisEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    async function fetchMisEmpresas() {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, empkey, rut, razon_social, nombre_fantasia, completado, estado_empresa, asignado_a')
        .eq('asignado_a', userId)
        .eq('completado', false)
        .order('empkey', { ascending: true });
      if (!error && data) setEmpresas(data);
      setCargando(false);
    }
    fetchMisEmpresas();
  }, [userId]);

  function irAEmpresa(empresa: Empresa) {
    navigate(`/formulario-inscripcion/${empresa.empkey}`);
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 4, py: 4 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Mis Empresas</Typography>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Borradores asignados a ti para completar
      </Typography>

      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : empresas.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            No tienes borradores asignados por el momento.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {empresas.map((empresa) => (
            <Grid key={empresa.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                onClick={() => irAEmpresa(empresa)}
                sx={{
                  p: 2.2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
                  transition: 'border-color 0.15s',
                  '&:hover': { borderColor: 'primary.main' },
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
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>· Empkey {empresa.empkey}</Typography>
                  </Box>
                </Box>
                <Chip
                  label="Pendiente"
                  size="small"
                  sx={{ fontSize: 10, fontWeight: 700, bgcolor: 'rgba(201,161,90,0.14)', color: '#B7791F', flexShrink: 0 }}
                />
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}