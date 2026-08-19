import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CircularProgress, Chip,
  Avatar, Divider, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { supabase } from '../lib/supabaseClient';
import { MONO_FONT } from '../theme/theme';

type EntradaHistorial = {
  id: string;
  seccion: string;
  descripcion: string;
  cambios: Record<string, any>;
  created_at: string;
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
  datos: 'Datos de empresa',
  representantes: 'Representantes',
  contactos: 'Contactos',
  usuarios: 'Usuarios',
  servicios: 'Servicios',
};

function formatearFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) + ' a las ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function iniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
}

// Renderiza un valor del cambio de forma legible
function RenderValor({ valor }: { valor: any }) {
  if (valor === null || valor === undefined) {
    return <Typography component="span" sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: 12 }}>vacío</Typography>;
  }
  if (Array.isArray(valor)) {
    if (valor.length === 0) return <Typography component="span" sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: 12 }}>ninguno</Typography>;
    return (
      <Box component="span" sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: 0.4 }}>
        {valor.map((v, i) => (
          <Chip key={i} label={typeof v === 'object' ? JSON.stringify(v) : String(v)} size="small"
            sx={{ fontSize: 10.5, height: 18 }} />
        ))}
      </Box>
    );
  }
  if (typeof valor === 'object') {
    return <Typography component="span" sx={{ fontFamily: MONO_FONT, fontSize: 11.5 }}>{JSON.stringify(valor)}</Typography>;
  }
  return <Typography component="span" sx={{ fontSize: 12.5 }}>{String(valor)}</Typography>;
}

// Muestra el diff antes/después de una sección
function DiffCambios({ cambios }: { cambios: Record<string, any> }) {
  const { antes, despues } = cambios;
  if (!antes && !despues) return null;

  // Si es un array de objetos (contactos, usuarios, representantes)
  if (Array.isArray(despues) || Array.isArray(antes)) {
    const listaAntes: any[] = Array.isArray(antes) ? antes : [];
    const listaDespues: any[] = Array.isArray(despues) ? despues : [];
    return (
      <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 0.8 }}>
            Antes ({listaAntes.length})
          </Typography>
          {listaAntes.length === 0
            ? <Typography sx={{ fontSize: 12, color: 'text.disabled', fontStyle: 'italic' }}>Sin registros</Typography>
            : listaAntes.map((item, i) => (
              <Box key={i} sx={{ fontSize: 12, mb: 0.5, p: 1, bgcolor: 'rgba(199,123,134,0.07)', borderRadius: 1, borderLeft: '3px solid #C77B86' }}>
                {Object.entries(item).map(([k, v]) => (
                  <Typography key={k} sx={{ fontSize: 11.5 }}>
                    <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary' }}>{k}:</Box>{' '}
                    {String(v)}
                  </Typography>
                ))}
              </Box>
            ))
          }
        </Box>
        <Box>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 0.8 }}>
            Después ({listaDespues.length})
          </Typography>
          {listaDespues.length === 0
            ? <Typography sx={{ fontSize: 12, color: 'text.disabled', fontStyle: 'italic' }}>Sin registros</Typography>
            : listaDespues.map((item, i) => (
              <Box key={i} sx={{ fontSize: 12, mb: 0.5, p: 1, bgcolor: 'rgba(94,156,122,0.07)', borderRadius: 1, borderLeft: '3px solid #5E9C7C' }}>
                {Object.entries(item).map(([k, v]) => (
                  <Typography key={k} sx={{ fontSize: 11.5 }}>
                    <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary' }}>{k}:</Box>{' '}
                    {String(v)}
                  </Typography>
                ))}
              </Box>
            ))
          }
        </Box>
      </Box>
    );
  }

  // Si es un objeto plano (datos de empresa)
  if (typeof antes === 'object' && typeof despues === 'object') {
    const campos = Array.from(new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})]));
    const camposConCambio = campos.filter(k => JSON.stringify(antes?.[k]) !== JSON.stringify(despues?.[k]));
    if (camposConCambio.length === 0) return null;
    return (
      <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
        {camposConCambio.map((campo) => (
          <Box key={campo} sx={{ display: 'grid', gridTemplateColumns: '90px 1fr auto 1fr', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase' }}>
              {campo}
            </Typography>
            <Box sx={{ p: 0.8, bgcolor: 'rgba(199,123,134,0.07)', borderRadius: 1, borderLeft: '3px solid #C77B86' }}>
              <RenderValor valor={antes?.[campo]} />
            </Box>
            <Typography sx={{ fontSize: 14, color: 'text.disabled' }}>→</Typography>
            <Box sx={{ p: 0.8, bgcolor: 'rgba(94,156,122,0.07)', borderRadius: 1, borderLeft: '3px solid #5E9C7C' }}>
              <RenderValor valor={despues?.[campo]} />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return null;
}

export default function HistorialEmpresa() {
  const { empkey } = useParams();
  const navigate = useNavigate();
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [razonSocial, setRazonSocial] = useState('');
  const [cargando, setCargando] = useState(true);
  const [expandido, setExpandido] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function cargar() {
      const { data: empresa } = await supabase
        .from('empresas').select('id, razon_social').eq('empkey', Number(empkey)).single();
      if (!empresa) { setCargando(false); return; }
      setRazonSocial(empresa.razon_social);

      // Query simple sin join — igual que HistorialBorradores para evitar 400
      const { data: historialData, error } = await supabase
        .from('empresa_historial')
        .select('id, usuario_id, seccion, descripcion, cambios, created_at')
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });

      if (error || !historialData || historialData.length === 0) {
        setCargando(false);
        return;
      }

      // Resolver perfiles por separado
      const usuarioIds = [...new Set(historialData.map((h: any) => h.usuario_id).filter(Boolean))];
      const mapaPerfiles = new Map<string, { nombre_completo: string | null; correo: string | null }>();
      if (usuarioIds.length > 0) {
        const { data: perfilesData } = await supabase
          .from('perfiles')
          .select('id, nombre_completo, correo')
          .in('id', usuarioIds);
        (perfilesData ?? []).forEach((p: any) => mapaPerfiles.set(p.id, p));
      }

      const enriquecido: EntradaHistorial[] = historialData.map((h: any) => ({
        id: h.id,
        seccion: h.seccion,
        descripcion: h.descripcion,
        cambios: h.cambios,
        created_at: h.created_at,
        perfil: h.usuario_id ? (mapaPerfiles.get(h.usuario_id) ?? null) : null,
      }));

      setHistorial(enriquecido);
      setCargando(false);
    }
    cargar();
  }, [empkey]);

  function toggleExpandido(id: string) {
    setExpandido(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  const nombreUsuario = (entrada: EntradaHistorial) =>
    entrada.perfil?.nombre_completo || entrada.perfil?.correo || 'Usuario desconocido';

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', px: 4, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/empresas/${empkey}`)}
          sx={{ color: 'text.secondary', pl: 0 }}>
          Volver a la ficha
        </Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <HistoryOutlinedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
        <Typography variant="h5">Historial de cambios</Typography>
      </Box>
      <Typography variant="subtitle1" sx={{ mb: 4 }}>
        {razonSocial} — Empkey {empkey}
      </Typography>

      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : historial.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: '8px' }}>
          Esta empresa aún no tiene cambios registrados.
        </Alert>
      ) : (
        <Box sx={{ position: 'relative' }}>
          {/* Línea vertical del timeline */}
          <Box sx={{
            position: 'absolute', left: 19, top: 8, bottom: 8,
            width: 2, bgcolor: '#EAE5F5', borderRadius: 999,
          }} />

          {historial.map((entrada) => {
            const color = COLOR_SECCION[entrada.seccion] ?? '#8B84A3';
            const tieneDiff = entrada.cambios && (entrada.cambios.antes || entrada.cambios.despues);
            const abierto = expandido.has(entrada.id);
            const nombre = nombreUsuario(entrada);

            return (
              <Box key={entrada.id} sx={{ display: 'flex', gap: 2.5, mb: 2 }}>
                {/* Punto del timeline */}
                <Box sx={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: '50%',
                    bgcolor: `${color}15`, border: `2px solid ${color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.1 }}>
                      {(LABEL_SECCION[entrada.seccion] ?? entrada.seccion).slice(0, 3)}
                    </Typography>
                  </Box>
                </Box>

                {/* Card del evento */}
                <Card sx={{ flexGrow: 1, p: 2, mb: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <Avatar sx={{ width: 26, height: 26, fontSize: 10, fontWeight: 700, bgcolor: 'primary.main' }}>
                        {iniciales(nombre)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{nombre}</Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                          {entrada.descripcion}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={LABEL_SECCION[entrada.seccion] ?? entrada.seccion}
                        size="small"
                        sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: `${color}15`, color }}
                      />
                      <Typography sx={{ fontSize: 11, color: 'text.disabled', fontFamily: MONO_FONT, whiteSpace: 'nowrap' }}>
                        {formatearFecha(entrada.created_at)}
                      </Typography>
                    </Box>
                  </Box>

                  {tieneDiff && (
                    <>
                      <Button
                        size="small"
                        onClick={() => toggleExpandido(entrada.id)}
                        sx={{ mt: 1, fontSize: 11, color: 'text.disabled', textTransform: 'none', p: 0, minWidth: 0 }}
                      >
                        {abierto ? '▲ Ocultar detalle' : '▼ Ver qué cambió'}
                      </Button>
                      {abierto && (
                        <>
                          <Divider sx={{ mt: 1, mb: 0.5 }} />
                          <DiffCambios cambios={entrada.cambios} />
                        </>
                      )}
                    </>
                  )}
                </Card>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}