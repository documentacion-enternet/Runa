import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, Avatar, CircularProgress, Chip,
  Accordion, AccordionSummary, AccordionDetails, Grid, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { EditOutlined as EditOutlinedIcon, DeleteOutlined as DeleteOutlineIcon, EventBusyOutlined as EventBusyOutlinedIcon, EventAvailableOutlined as EventAvailableOutlinedIcon, DeleteForeverOutlined as DeleteForeverOutlinedIcon } from '@mui/icons-material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { MONO_FONT } from '../theme/theme';
import {
  bonito, ICONO_POR_CODIGO, COLOR_POR_GRUPO, computeDocumentosParaBO, DetalleServicioView,
} from '../components/DetalleServicioView';

type Empresa = {
  id: string; empkey: number; rut: string; razon_social: string; nombre_fantasia: string | null;
  completado: boolean; creado_por: string | null; estado_empresa: 'activa' | 'caducada' | 'eliminada';
  asignado_a: string | null;
};
type Contacto = { id: string; tipo: string; nombre: string; apellido: string; correo: string | null; telefono: string | null };
type Usuario = { id: string; rut: string; nombre: string; estado: string; fecha_desde: string };
type EmpresaServicio = { id: string; detalles: any; estado: string; servicio: { codigo: string; nombre: string; grupo: string } };

export default function FichaEmpresa() {
  const { empkey } = useParams();
  const navigate = useNavigate();
  const { session, esAdmin, esLider, esVista } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [servicios, setServicios] = useState<EmpresaServicio[]>([]);
  const [anchorAcciones, setAnchorAcciones] = useState<null | HTMLElement>(null);
  const [dialogoEliminar, setDialogoEliminar] = useState(false);
  const [dialogoEliminarPermanente, setDialogoEliminarPermanente] = useState(false);
  const [textoConfirmacion, setTextoConfirmacion] = useState('');
  const [eliminandoPermanente, setEliminandoPermanente] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      const { data: empresaData } = await supabase.from('empresas').select('*').eq('empkey', Number(empkey)).single();
      if (!empresaData) {
        setCargando(false);
        return;
      }
      setEmpresa(empresaData);

      const [{ data: contactosData }, { data: usuariosData }, { data: serviciosData }] = await Promise.all([
        supabase.from('contactos').select('*').eq('empresa_id', empresaData.id),
        supabase.from('usuarios_activos').select('*').eq('empresa_id', empresaData.id),
        supabase.from('empresa_servicios').select('id, detalles, estado, servicio:servicio_id(codigo, nombre, grupo)').eq('empresa_id', empresaData.id),
      ]);

      setContactos(contactosData ?? []);
      setUsuarios(usuariosData ?? []);
      setServicios((serviciosData as any) ?? []);
      setCargando(false);
    }
    cargar();
  }, [empkey]);

  function iniciales(nombre: string) {
    return nombre.slice(0, 2).toUpperCase();
  }

  async function cambiarEstado(nuevoEstado: 'activa' | 'caducada' | 'eliminada') {
    if (!empresa) return;
    setProcesando(true);
    setErrorAccion(null);
    const { error } = await supabase.from('empresas').update({ estado_empresa: nuevoEstado }).eq('id', empresa.id);
    setProcesando(false);
    setAnchorAcciones(null);
    setDialogoEliminar(false);
    if (error) {
      setErrorAccion('No se pudo actualizar el estado: ' + error.message);
      return;
    }
    setEmpresa({ ...empresa, estado_empresa: nuevoEstado });
  }

  async function eliminarPermanentemente() {
    if (!empresa) return;
    setEliminandoPermanente(true);
    setErrorAccion(null);

    const { data, error: errorFuncion } = await supabase.functions.invoke('permanently-delete-empresa', {
      body: { empresaId: empresa.id },
    });

    setEliminandoPermanente(false);

    if (errorFuncion || data?.error) {
      setErrorAccion(data?.error || errorFuncion?.message || 'No se pudo eliminar la empresa permanentemente');
      return;
    }

    setDialogoEliminarPermanente(false);
    navigate('/');
  }

  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (!empresa) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 4, py: 4 }}>
        <Typography sx={{ color: 'text.secondary' }}>No se encontró ninguna empresa con Empkey {empkey}.</Typography>
      </Box>
    );
  }

  const tecnicos = contactos.filter((c) => c.tipo === 'tecnico');
  const facturacion = contactos.filter((c) => c.tipo === 'facturacion');

  // Puede editar: admin, lider, o el agente que creó/tiene asignado el borrador
  const puedeEditar = esAdmin || esLider ||
    (empresa.creado_por === session?.user.id || empresa.asignado_a === session?.user.id);

  // Menú Acciones: visible para admin y lider (con acciones distintas)
  const tieneAcciones = esAdmin || esLider;

  // Acciones disponibles según rol y estado
  //const puedeEliminarOReactivarComoEliminada = esAdmin; // solo admin mueve a/desde 'eliminada'
  const puedeCaducarReactivar = esAdmin || esLider;     // lider puede activa↔caducada

  const detallesPorCodigo = Object.fromEntries(servicios.map((s) => [s.servicio.codigo, s.detalles]));
  const documentosParaBO = computeDocumentosParaBO(detallesPorCodigo);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 4, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ color: 'text.secondary', pl: 0 }}>
          Volver a Empresas
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Botón Editar: visible si puede editar y no es solo vista */}
          {puedeEditar && !esVista && (
            <Button startIcon={<EditOutlinedIcon />} variant="outlined" size="small" onClick={() => navigate(`/formulario-inscripcion/${empkey}`)}>
              Editar información
            </Button>
          )}

          {/* Menú Acciones: admin y lider, con opciones distintas */}
          {tieneAcciones && (
            <>
              <Button
                startIcon={<MoreVertIcon />}
                variant="outlined"
                size="small"
                color="inherit"
                onClick={(e) => setAnchorAcciones(e.currentTarget)}
                sx={{ color: 'text.secondary', borderColor: 'divider' }}
              >
                Acciones
              </Button>
              <Menu anchorEl={anchorAcciones} open={Boolean(anchorAcciones)} onClose={() => setAnchorAcciones(null)}>
                {/* Estado: activa */}
                {empresa.estado_empresa === 'activa' && puedeCaducarReactivar && (
                  <MenuItem onClick={() => cambiarEstado('caducada')} disabled={procesando} sx={{ fontSize: 13.5, gap: 1.2 }}>
                    <EventBusyOutlinedIcon fontSize="small" sx={{ color: '#B7791F' }} />
                    Marcar como caducada
                  </MenuItem>
                )}
                {empresa.estado_empresa === 'activa' && esAdmin && (
                  <MenuItem onClick={() => { setAnchorAcciones(null); setDialogoEliminar(true); }} sx={{ fontSize: 13.5, gap: 1.2 }}>
                    <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
                    Eliminar empresa
                  </MenuItem>
                )}

                {/* Estado: caducada */}
                {empresa.estado_empresa === 'caducada' && puedeCaducarReactivar && (
                  <MenuItem onClick={() => cambiarEstado('activa')} disabled={procesando} sx={{ fontSize: 13.5, gap: 1.2 }}>
                    <EventAvailableOutlinedIcon fontSize="small" sx={{ color: 'secondary.main' }} />
                    Reactivar empresa
                  </MenuItem>
                )}
                {empresa.estado_empresa === 'caducada' && esAdmin && (
                  <MenuItem onClick={() => { setAnchorAcciones(null); setDialogoEliminar(true); }} sx={{ fontSize: 13.5, gap: 1.2 }}>
                    <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
                    Eliminar empresa
                  </MenuItem>
                )}

                {/* Estado: eliminada — solo admin */}
                {empresa.estado_empresa === 'eliminada' && esAdmin && [
                  <MenuItem key="reactivar" onClick={() => cambiarEstado('activa')} disabled={procesando} sx={{ fontSize: 13.5, gap: 1.2 }}>
                    <EventAvailableOutlinedIcon fontSize="small" sx={{ color: 'secondary.main' }} />
                    Reactivar empresa
                  </MenuItem>,
                  <MenuItem
                    key="eliminar-permanente"
                    onClick={() => { setAnchorAcciones(null); setDialogoEliminarPermanente(true); setTextoConfirmacion(''); }}
                    sx={{ fontSize: 13.5, gap: 1.2 }}
                  >
                    <DeleteForeverOutlinedIcon fontSize="small" sx={{ color: 'error.main' }} />
                    Eliminar permanentemente
                  </MenuItem>,
                ]}

                {/* Si el lider ve una empresa eliminada, no tiene ninguna acción disponible */}
                {empresa.estado_empresa === 'eliminada' && esLider && !esAdmin && (
                  <MenuItem disabled sx={{ fontSize: 13, color: 'text.disabled' }}>
                    Sin acciones disponibles
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </Box>
      </Box>

      {errorAccion && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }} onClose={() => setErrorAccion(null)}>{errorAccion}</Alert>}

      {empresa.estado_empresa === 'caducada' && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: '8px', bgcolor: 'rgba(201,161,90,0.12)' }}>
          <Typography sx={{ fontSize: 12.5, color: '#B7791F', fontWeight: 600 }}>
            Esta empresa está marcada como caducada — ya no se considera un cliente activo.
          </Typography>
        </Box>
      )}

      {empresa.estado_empresa === 'eliminada' && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: '8px', bgcolor: 'rgba(199,123,134,0.12)' }}>
          <Typography sx={{ fontSize: 12.5, color: '#A85F6A', fontWeight: 600 }}>
            Esta empresa fue eliminada{esAdmin ? ' — usa "Reactivar empresa" en Acciones si fue un error.' : '.'}
          </Typography>
        </Box>
      )}

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={dialogoEliminar} onClose={() => setDialogoEliminar(false)}>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>¿Eliminar esta empresa?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            La empresa dejará de aparecer como activa. Es reversible — puedes volver a activarla desde
            "Acciones → Reactivar empresa" en cualquier momento.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogoEliminar(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={() => cambiarEstado('eliminada')} disabled={procesando} variant="contained" color="error">
            {procesando ? 'Eliminando...' : 'Sí, eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación para eliminar PERMANENTEMENTE */}
      <Dialog open={dialogoEliminarPermanente} onClose={() => setDialogoEliminarPermanente(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: 'error.main' }}>⚠️ Eliminar permanentemente</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 2 }}>
            Esta acción es <strong>irreversible</strong>. Se borrará toda la información de <strong>{empresa?.razon_social}</strong> —
            contactos, usuarios y servicios — de forma permanente. Antes de borrar, se enviará un respaldo en CSV
            por correo a todos los admins.
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
            Escribe <strong>{empresa?.razon_social}</strong> para confirmar:
          </Typography>
          <TextField
            fullWidth size="small" autoFocus
            value={textoConfirmacion}
            onChange={(e) => setTextoConfirmacion(e.target.value)}
            placeholder={empresa?.razon_social}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogoEliminarPermanente(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button
            onClick={eliminarPermanentemente}
            disabled={eliminandoPermanente || textoConfirmacion.trim() !== empresa?.razon_social}
            variant="contained"
            color="error"
          >
            {eliminandoPermanente ? 'Eliminando...' : 'Eliminar permanentemente'}
          </Button>
        </DialogActions>
      </Dialog>

      {!empresa.completado && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: '8px', bgcolor: 'rgba(201,161,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 12.5, color: '#B7791F' }}>Esta empresa quedó como borrador — su inscripción no está completa.</Typography>
          {!esVista && (
            <Button size="small" variant="outlined" onClick={() => navigate(`/formulario-inscripcion/${empkey}`)}>
              Continuar registro
            </Button>
          )}
        </Box>
      )}

      <Card sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Avatar sx={{ width: 48, height: 48, bgcolor: 'text.primary', fontWeight: 700 }}>
              {iniciales(empresa.nombre_fantasia || empresa.razon_social)}
            </Avatar>
            <Box>
              <Typography variant="h5">{empresa.razon_social}</Typography>
              {empresa.nombre_fantasia && (
                <Typography variant="subtitle1">Nombre de fantasía: {empresa.nombre_fantasia}</Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Box sx={{ bgcolor: '#F5F2FB', border: '1px solid #EAE5F5', borderRadius: '8px', px: 1.5, py: 0.7 }}>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: 12.5, fontWeight: 600, color: 'secondary.main' }}>
                {empresa.rut}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: '#F5F2FB', border: '1px solid #EAE5F5', borderRadius: '8px', px: 1.5, py: 0.7 }}>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: 12.5, fontWeight: 600, color: 'text.secondary' }}>
                Empkey {empresa.empkey}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1.5 }}>
        Contacto de Empresa
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {tecnicos.length === 0 && facturacion.length === 0 && (
          <Grid size={12}>
            <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>Sin contactos registrados.</Typography>
          </Grid>
        )}
        {tecnicos.map((c) => (
          <Grid key={c.id} size={{ xs: 12, sm: 6 }}>
            <Card sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'secondary.main', textTransform: 'uppercase', mb: 0.5 }}>
                Contraparte Técnica
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{c.nombre} {c.apellido}</Typography>
              {c.correo && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mt: 0.5 }}>
                  <MailOutlineIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{c.correo}</Typography>
                </Box>
              )}
              {c.telefono && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mt: 0.3 }}>
                  <PhoneOutlinedIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{c.telefono}</Typography>
                </Box>
              )}
            </Card>
          </Grid>
        ))}
        {facturacion.map((c) => (
          <Grid key={c.id} size={{ xs: 12, sm: 6 }}>
            <Card sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', mb: 0.5 }}>
                Contacto de Facturación
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{c.nombre} {c.apellido}</Typography>
              {c.correo && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mt: 0.5 }}>
                  <MailOutlineIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{c.correo}</Typography>
                </Box>
              )}
              {c.telefono && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mt: 0.3 }}>
                  <PhoneOutlinedIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{c.telefono}</Typography>
                </Box>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1.5 }}>
        Usuarios Activos ({usuarios.filter((u) => u.estado === 'activo').length})
      </Typography>
      {usuarios.length === 0 ? (
        <Typography sx={{ fontSize: 12.5, color: 'text.disabled', mb: 4 }}>Sin usuarios registrados.</Typography>
      ) : (
        <Card sx={{ mb: 4, overflow: 'hidden' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: '#FAF8FD' }}>
                {['RUT', 'Nombre', 'Desde', 'Estado'].map((h) => (
                  <Box component="th" key={h} sx={{ textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', px: 2, py: 1, borderBottom: '1px solid #EAE5F5' }}>
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {usuarios.map((u) => (
                <Box component="tr" key={u.id}>
                  <Box component="td" sx={{ fontFamily: MONO_FONT, fontSize: 12, px: 2, py: 1, borderBottom: '1px solid #EAE5F5' }}>{u.rut}</Box>
                  <Box component="td" sx={{ fontSize: 13, fontWeight: 600, px: 2, py: 1, borderBottom: '1px solid #EAE5F5' }}>{u.nombre}</Box>
                  <Box component="td" sx={{ fontFamily: MONO_FONT, fontSize: 11.5, color: 'text.disabled', px: 2, py: 1, borderBottom: '1px solid #EAE5F5' }}>{u.fecha_desde}</Box>
                  <Box component="td" sx={{ px: 2, py: 1, borderBottom: '1px solid #EAE5F5' }}>
                    <Chip
                      label={bonito(u.estado)}
                      size="small"
                      sx={{
                        fontSize: 10, fontWeight: 700, height: 18,
                        bgcolor: u.estado === 'activo' ? 'rgba(94,156,122,0.12)' : 'rgba(139,132,163,0.12)',
                        color: u.estado === 'activo' ? 'secondary.main' : 'text.disabled',
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Card>
      )}

      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1.5 }}>
        Servicios Contratados ({servicios.length})
      </Typography>
      {servicios.length === 0 ? (
        <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>Sin servicios registrados.</Typography>
      ) : (
        <Box>
          {servicios.map((s) => {
            const Icono = ICONO_POR_CODIGO[s.servicio.codigo] ?? DescriptionOutlinedIcon;
            const color = COLOR_POR_GRUPO[s.servicio.grupo] ?? '#8B84A3';
            return (
              <Accordion key={s.id} sx={{ mb: 1, '&:before': { display: 'none' } }} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, width: '100%' }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: `${color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icono sx={{ fontSize: 15, color }} />
                    </Box>
                    <Typography sx={{ fontFamily: MONO_FONT, fontSize: 12, fontWeight: 700, color: 'secondary.main' }}>
                      {s.servicio.codigo}
                    </Typography>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{s.servicio.nombre}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <DetalleServicioView
                    codigo={s.servicio.codigo}
                    nombreServicio={s.servicio.nombre}
                    detalle={s.detalles}
                    documentosCalculadosBO={s.servicio.codigo === 'BO' ? documentosParaBO : undefined}
                  />
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Box>
  );
}