import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Stepper, Step, StepButton, TextField, Button,
  Grid, IconButton, Alert, Divider, Chip, Card,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DeleteOutlined as DeleteOutlineIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { ServiciosStep } from './inscripcion/ServiciosStep';
import type { DetallesServicios } from './inscripcion/servicios-types';
import {
  SERVICIOS_INFO, ICONO_POR_CODIGO, COLOR_POR_GRUPO, computeDocumentosParaBO, DetalleServicioView,
} from '../components/DetalleServicioView';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { MONO_FONT } from '../theme/theme';

const RUT_REGEX = /^[0-9]{7,8}-[0-9kK]$/;

type Contacto = { nombre: string; apellido: string; correo: string; telefono: string };
const contactoVacio = (): Contacto => ({ nombre: '', apellido: '', correo: '', telefono: '' });

type Usuario = { rut: string; nombre: string; estado: 'activo' | 'inactivo' };

type Representante = {
  rut: string;
  nombre_completo: string;
  tipo: 'representante_legal' | 'autorizado_sii';
  estado: 'activo' | 'inactivo';
};
const representanteVacio = (): Representante => ({
  rut: '', nombre_completo: '', tipo: 'representante_legal', estado: 'activo',
});

const steps = ['Datos de Empresa', 'Representantes', 'Contactos', 'Usuarios', 'Servicios', 'Resumen'];
const PASOS_CON_GUARDADO = [0, 1, 2, 3];

const ETIQUETA_TIPO: Record<Representante['tipo'], string> = {
  representante_legal: 'Representante Legal',
  autorizado_sii: 'Autorizado SII',
};
const COLOR_TIPO: Record<Representante['tipo'], string> = {
  representante_legal: '#7A6BB0',
  autorizado_sii: '#5E9C7C',
};

export default function FormularioInscripcion() {
  const navigate = useNavigate();
  const { empkey: empkeyUrl } = useParams();
  const { session } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [cargandoBorrador, setCargandoBorrador] = useState(!!empkeyUrl);
  const [registroCompletado, setRegistroCompletado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardandoPaso, setGuardandoPaso] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // Paso 0
  const [empkey, setEmpkey] = useState('');
  const [rut, setRut] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreFantasia, setNombreFantasia] = useState('');

  // Paso 1: Representantes
  const [representantes, setRepresentantes] = useState<Representante[]>([]);

  function agregarRepresentante() { setRepresentantes((p) => [...p, representanteVacio()]); }
  function actualizarRepresentante(i: number, campo: keyof Representante, valor: string) {
    setRepresentantes((p) => { const c = [...p]; c[i] = { ...c[i], [campo]: valor } as Representante; return c; });
  }
  function eliminarRepresentante(i: number) { setRepresentantes((p) => p.filter((_, j) => j !== i)); }

  // Paso 2: Contactos
  const [tecnicos, setTecnicos] = useState<Contacto[]>([contactoVacio()]);
  const [facturacion, setFacturacion] = useState<Contacto[]>([contactoVacio()]);

  function agregarContacto(tipo: 'tecnico' | 'facturacion') {
    if (tipo === 'tecnico') setTecnicos([...tecnicos, contactoVacio()]);
    else setFacturacion([...facturacion, contactoVacio()]);
  }
  function actualizarContacto(tipo: 'tecnico' | 'facturacion', i: number, campo: keyof Contacto, valor: string) {
    if (tipo === 'tecnico') { const c = [...tecnicos]; c[i] = { ...c[i], [campo]: valor }; setTecnicos(c); }
    else { const c = [...facturacion]; c[i] = { ...c[i], [campo]: valor }; setFacturacion(c); }
  }
  function eliminarContacto(tipo: 'tecnico' | 'facturacion', i: number) {
    if (tipo === 'tecnico') setTecnicos(tecnicos.filter((_, j) => j !== i));
    else setFacturacion(facturacion.filter((_, j) => j !== i));
  }

  // Paso 3: Usuarios
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  function agregarUsuario() { setUsuarios([...usuarios, { rut: '', nombre: '', estado: 'activo' }]); }
  function actualizarUsuario(i: number, campo: keyof Usuario, valor: string) {
    const c = [...usuarios]; c[i] = { ...c[i], [campo]: valor } as Usuario; setUsuarios(c);
  }
  function eliminarUsuario(i: number) { setUsuarios(usuarios.filter((_, j) => j !== i)); }

  // Paso 4: Servicios
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([]);
  const [detallesServicios, setDetallesServicios] = useState<DetallesServicios>({});
  function actualizarDetalleServicio(codigo: string, detalle: unknown) {
    setDetallesServicios((prev) => ({ ...prev, [codigo]: detalle }));
  }

  // ── Cargar borrador ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!empkeyUrl) return;
    async function cargarBorrador() {
      const { data: empresa } = await supabase.from('empresas').select('*').eq('empkey', Number(empkeyUrl)).single();
      if (!empresa) { setCargandoBorrador(false); return; }

      const idReal = empresa.id;
      setEmpresaId(idReal);
      setEmpkey(String(empresa.empkey));
      setRut(empresa.rut);
      setRazonSocial(empresa.razon_social);
      setNombreFantasia(empresa.nombre_fantasia ?? '');

      const { data: repsData } = await supabase.from('representantes').select('*').eq('empresa_id', idReal);
      if (repsData && repsData.length > 0) {
        setRepresentantes(repsData.map((r) => ({
          rut: r.rut, nombre_completo: r.nombre_completo, tipo: r.tipo, estado: r.estado,
        })));
      }

      const { data: contactosData } = await supabase.from('contactos').select('*').eq('empresa_id', idReal);
      if (contactosData && contactosData.length > 0) {
        const tecs = contactosData.filter((c) => c.tipo === 'tecnico');
        const facts = contactosData.filter((c) => c.tipo === 'facturacion');
        if (tecs.length > 0) setTecnicos(tecs.map((c) => ({ nombre: c.nombre, apellido: c.apellido, correo: c.correo ?? '', telefono: c.telefono ?? '' })));
        if (facts.length > 0) setFacturacion(facts.map((c) => ({ nombre: c.nombre, apellido: c.apellido, correo: c.correo ?? '', telefono: c.telefono ?? '' })));
      }

      const { data: usuariosData } = await supabase.from('usuarios_activos').select('*').eq('empresa_id', idReal);
      if (usuariosData && usuariosData.length > 0) {
        setUsuarios(usuariosData.map((u) => ({ rut: u.rut, nombre: u.nombre, estado: u.estado })));
      }

      const { data: serviciosData } = await supabase
        .from('empresa_servicios').select('detalles, servicio:servicio_id(codigo)').eq('empresa_id', idReal);
      if (serviciosData && serviciosData.length > 0) {
        const codigos = serviciosData.map((s: any) => s.servicio?.codigo).filter(Boolean);
        const detallesMap: DetallesServicios = {};
        serviciosData.forEach((s: any) => {
          if (!s.servicio?.codigo) return;
          const detalle = { ...s.detalles };
          if (Array.isArray(detalle.documentos) && detalle.documentos.length > 0 && typeof detalle.documentos[0] === 'object') {
            detalle.documentos = detalle.documentos.map((d: any) => ({
              ...d, almacenaEn: Array.isArray(d.almacenaEn) ? d.almacenaEn : [d.almacenaEn],
            }));
          }
          detallesMap[s.servicio.codigo as keyof DetallesServicios] = detalle;
        });
        setServiciosSeleccionados(codigos);
        setDetallesServicios(detallesMap);
      }
      setCargandoBorrador(false);
    }
    cargarBorrador();
  }, [empkeyUrl]);

  // ── Validación ────────────────────────────────────────────────────────────
  function validarPaso(paso: number): string | null {
    if (paso === 0) {
      if (!empkey.trim()) return 'El Empkey es obligatorio';
      if (!rut.trim() || !RUT_REGEX.test(rut.trim())) return 'El RUT debe tener el formato 76543210-8 (sin puntos)';
      if (!razonSocial.trim()) return 'La razón social es obligatoria';
    }
    if (paso === 1) {
      for (const r of representantes) {
        const iniciado = r.rut.trim() !== '' || r.nombre_completo.trim() !== '';
        if (iniciado && !r.rut.trim()) return 'Completa el RUT del representante que empezaste a llenar';
        if (iniciado && !RUT_REGEX.test(r.rut.trim())) return `RUT inválido: ${r.rut} (formato esperado: 76543210-8)`;
        if (iniciado && !r.nombre_completo.trim()) return 'Completa el nombre completo del representante que empezaste a llenar';
      }
    }
    if (paso === 2) {
      for (const c of tecnicos) {
        const iniciado = c.nombre.trim() !== '' || c.apellido.trim() !== '';
        if (iniciado && (!c.nombre.trim() || !c.apellido.trim())) return 'Completa nombre y apellido de la Contraparte Técnica que empezaste a llenar';
        if (c.correo && !c.correo.includes('@')) return 'Hay un correo inválido en Contraparte Técnica';
      }
      for (const c of facturacion) {
        const iniciado = c.nombre.trim() !== '' || c.apellido.trim() !== '';
        if (iniciado && (!c.nombre.trim() || !c.apellido.trim())) return 'Completa nombre y apellido del Contacto de Facturación que empezaste a llenar';
        if (c.correo && !c.correo.includes('@')) return 'Hay un correo inválido en Contacto de Facturación';
      }
      const tecnicosCompletos = tecnicos.filter((c) => c.nombre.trim() && c.apellido.trim());
      const facturacionCompletos = facturacion.filter((c) => c.nombre.trim() && c.apellido.trim());
      if (tecnicosCompletos.length === 0 && facturacionCompletos.length === 0) {
        return 'Debes ingresar al menos un contacto: Contraparte Técnica o Contacto de Facturación';
      }
    }
    if (paso === 3) {
      for (const u of usuarios) {
        if (!u.rut.trim() || !u.nombre.trim()) return 'Completa RUT y nombre de todos los usuarios agregados';
      }
    }
    if (paso === 4) {
      if (serviciosSeleccionados.length === 0) return 'Debes seleccionar al menos un servicio contratado';
    }
    return null;
  }

  // ── Guardado por paso ─────────────────────────────────────────────────────
  async function guardarPasoDatosEmpresa(): Promise<string | null> {
    const { data: existentes } = await supabase.from('empresas').select('id').eq('empkey', Number(empkey));
    const duplicado = existentes?.find((e) => e.id !== empresaId);
    if (duplicado) return 'Ya existe otra empresa con ese Empkey';
    if (empresaId) {
      const { error } = await supabase.from('empresas').update({
        empkey: Number(empkey), rut: rut.trim(), razon_social: razonSocial.trim(),
        nombre_fantasia: nombreFantasia.trim() || null,
      }).eq('id', empresaId);
      return error?.message ?? null;
    }
    const { data, error } = await supabase.from('empresas').insert({
      empkey: Number(empkey), rut: rut.trim(), razon_social: razonSocial.trim(),
      nombre_fantasia: nombreFantasia.trim() || null, completado: false, creado_por: session?.user.id,
    }).select('id').single();
    if (error || !data) return error?.message ?? 'Error desconocido al crear la empresa';
    setEmpresaId(data.id);
    return null;
  }

  async function guardarPasoRepresentantes(): Promise<string | null> {
    if (!empresaId) return 'Falta guardar los Datos de Empresa primero';
    await supabase.from('representantes').delete().eq('empresa_id', empresaId);
    const filas = representantes
      .filter((r) => r.rut.trim() && r.nombre_completo.trim())
      .map((r) => ({ empresa_id: empresaId, rut: r.rut.trim(), nombre_completo: r.nombre_completo.trim(), tipo: r.tipo, estado: r.estado }));
    if (filas.length === 0) return null;
    const { error } = await supabase.from('representantes').insert(filas);
    return error?.message ?? null;
  }

  async function guardarPasoContactos(): Promise<string | null> {
    if (!empresaId) return 'Falta guardar los Datos de Empresa primero';
    await supabase.from('contactos').delete().eq('empresa_id', empresaId);
    const filas = [
      ...tecnicos.filter((c) => c.nombre.trim() && c.apellido.trim()).map((c) => ({
        empresa_id: empresaId, tipo: 'tecnico', nombre: c.nombre.trim(), apellido: c.apellido.trim(),
        correo: c.correo.trim() || null, telefono: c.telefono.trim() || null,
      })),
      ...facturacion.filter((c) => c.nombre.trim() && c.apellido.trim()).map((c) => ({
        empresa_id: empresaId, tipo: 'facturacion', nombre: c.nombre.trim(), apellido: c.apellido.trim(),
        correo: c.correo.trim() || null, telefono: c.telefono.trim() || null,
      })),
    ];
    if (filas.length === 0) return null;
    const { error } = await supabase.from('contactos').insert(filas);
    return error?.message ?? null;
  }

  async function guardarPasoUsuarios(): Promise<string | null> {
    if (!empresaId) return 'Falta guardar los Datos de Empresa primero';
    await supabase.from('usuarios_activos').delete().eq('empresa_id', empresaId);
    if (usuarios.length > 0) {
      const { error } = await supabase.from('usuarios_activos').insert(
        usuarios.map((u) => ({ empresa_id: empresaId, rut: u.rut.trim(), nombre: u.nombre.trim(), estado: u.estado }))
      );
      return error?.message ?? null;
    }
    return null;
  }

  async function guardarPasoServiciosFinal(): Promise<string | null> {
    if (!empresaId) return 'Falta guardar los Datos de Empresa primero';
    await supabase.from('empresa_servicios').delete().eq('empresa_id', empresaId);
    const { data: serviciosCatalogo } = await supabase.from('servicios_catalogo').select('id, codigo');
    const { data: documentosCatalogo } = await supabase.from('documentos_catalogo').select('id, codigo');
    const mapaServicios = new Map((serviciosCatalogo ?? []).map((s) => [s.codigo, s.id]));
    const mapaDocumentos = new Map((documentosCatalogo ?? []).map((d) => [d.codigo, d.id]));

    for (const codigo of serviciosSeleccionados) {
      const servicioId = mapaServicios.get(codigo);
      if (!servicioId) continue;
      const detalle = (detallesServicios as any)[codigo] ?? {};
      const { data: nuevoEmpresaServicio, error: errServicio } = await supabase
        .from('empresa_servicios').insert({ empresa_id: empresaId, servicio_id: servicioId, detalles: detalle })
        .select('id').single();
      if (errServicio || !nuevoEmpresaServicio) return `Error al guardar el servicio ${codigo}: ${errServicio?.message}`;
      if ((codigo === 'EF' || codigo === 'EFP') && detalle.documentos?.length > 0) {
        const filasDocumentos = detalle.documentos.map((d: any) => {
          const documentoId = mapaDocumentos.get(d.codigo);
          const almacenaEnArray = Array.isArray(d.almacenaEn) ? d.almacenaEn : [d.almacenaEn];
          return documentoId ? { empresa_servicio_id: nuevoEmpresaServicio.id, documento_id: documentoId, almacena_en: almacenaEnArray, canales: d.canales } : null;
        }).filter(Boolean);
        if (filasDocumentos.length > 0) {
          const { error: errDocs } = await supabase.from('empresa_servicio_documentos').insert(filasDocumentos);
          if (errDocs) return `Error al guardar documentos de ${codigo}: ${errDocs.message}`;
        }
      }
    }

    const { data: empresaActual } = await supabase.from('empresas').select('completado').eq('id', empresaId).single();
    const esPrimeraVezCompletada = !empresaActual?.completado;
    const { error: errCompletar } = await supabase.from('empresas').update({
      completado: true,
      ...(esPrimeraVezCompletada ? { completado_por: session?.user.id, completado_en: new Date().toISOString() } : {}),
    }).eq('id', empresaId);
    if (errCompletar) return errCompletar.message;
    if (esPrimeraVezCompletada) {
      supabase.functions.invoke('notify-empresa-completada', { body: { razonSocial, empkey } }).catch(() => {});
    }
    return null;
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  async function irAPaso(destino: number) {
    if (destino === activeStep) return;
    if (PASOS_CON_GUARDADO.includes(activeStep)) {
      const errorValidacion = validarPaso(activeStep);
      if (errorValidacion) { setError(errorValidacion); return; }
      setError(null);
      setGuardandoPaso(true);
      let errorGuardado: string | null = null;
      if (activeStep === 0) errorGuardado = await guardarPasoDatosEmpresa();
      else if (activeStep === 1) errorGuardado = await guardarPasoRepresentantes();
      else if (activeStep === 2) errorGuardado = await guardarPasoContactos();
      else if (activeStep === 3) errorGuardado = await guardarPasoUsuarios();
      setGuardandoPaso(false);
      if (errorGuardado) { setError('Error al guardar: ' + errorGuardado); return; }
    } else { setError(null); }
    setActiveStep(destino);
  }

  async function irSiguiente() { await irAPaso(activeStep + 1); }
  function irAtras() { setError(null); setActiveStep((s) => s - 1); }

  // Guardar el paso actual sin avanzar
  async function guardarSinAvanzar() {
    if (!PASOS_CON_GUARDADO.includes(activeStep)) return;
    const errorValidacion = validarPaso(activeStep);
    if (errorValidacion) { setError(errorValidacion); return; }
    setError(null);
    setGuardandoPaso(true);
    setGuardadoExitoso(false);

    let errorGuardado: string | null = null;
    if (activeStep === 0) errorGuardado = await guardarPasoDatosEmpresa();
    else if (activeStep === 1) errorGuardado = await guardarPasoRepresentantes();
    else if (activeStep === 2) errorGuardado = await guardarPasoContactos();
    else if (activeStep === 3) errorGuardado = await guardarPasoUsuarios();

    setGuardandoPaso(false);
    if (errorGuardado) { setError('Error al guardar: ' + errorGuardado); return; }

    // Mostrar feedback por 2 segundos
    setGuardadoExitoso(true);
    setTimeout(() => setGuardadoExitoso(false), 2000);
  }

  async function handleGuardarFinal() {
    const errorValidacion = validarPaso(4);
    if (errorValidacion) { setError(errorValidacion); return; }
    setError(null);
    setGuardandoPaso(true);
    const errorGuardado = await guardarPasoServiciosFinal();
    setGuardandoPaso(false);
    if (errorGuardado) { setError('Error al guardar: ' + errorGuardado); return; }
    setRegistroCompletado(true);
  }

  function dispararConfeti() {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#7A6BB0', '#5E9C7C', '#B79B85', '#5B4E82'] });
  }
  useEffect(() => { if (registroCompletado) dispararConfeti(); }, [registroCompletado]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* Stepper fuera del maxWidth — ocupa el ancho del Layout */}
      {!registroCompletado && !cargandoBorrador && (
        <Box sx={{ px: 4, pt: 4, pb: 0 }}>
          {/* Mobile: barra de progreso */}
          <Box sx={{ display: { xs: 'block', sm: 'none' }, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 600 }}>
                Paso {activeStep + 1} de {steps.length}
              </Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'primary.main' }}>
                {steps[activeStep]}
              </Typography>
            </Box>
            <Box sx={{ height: 4, borderRadius: 999, bgcolor: '#EAE5F5', overflow: 'hidden' }}>
              <Box sx={{
                height: '100%', borderRadius: 999, bgcolor: 'primary.main',
                width: `${((activeStep + 1) / steps.length) * 100}%`,
                transition: 'width 0.3s ease',
              }} />
            </Box>
          </Box>

          {/* sm+: stepper que usa el ancho disponible sin cortar */}
          <Box sx={{ display: { xs: 'none', sm: 'block' }, mb: 4 }}>
            <Stepper activeStep={activeStep}
              sx={{
                '& .MuiStepLabel-label': { fontSize: 12, whiteSpace: 'nowrap' },
                '& .MuiStepConnector-line': { minWidth: 16 },
              }}>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepButton onClick={() => irAPaso(index)} disabled={guardandoPaso}>
                    {label}
                  </StepButton>
                </Step>
              ))}
            </Stepper>
          </Box>
        </Box>
      )}

      {/* Contenido centrado con maxWidth */}
      <Box sx={{ maxWidth: 720, mx: 'auto', px: 4, pb: 4 }}>
      {registroCompletado ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <CheckCircleIcon sx={{ fontSize: 56, color: 'secondary.main', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1 }}>
            ¡Excelente! Completaste el registro{' '}
            <Box component="span" onClick={dispararConfeti}
              sx={{ cursor: 'pointer', display: 'inline-block', '&:hover': { transform: 'scale(1.2)' }, transition: 'transform 0.15s' }}>
              🎉
            </Box>
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 4 }}>
            <strong>{razonSocial}</strong> ya quedó registrada en Runa con todos sus datos, contactos, usuarios y servicios.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={() => { window.location.href = '/formulario-inscripcion'; }}>Registrar otra empresa</Button>
            <Button variant="contained" onClick={() => navigate(`/empresas/${empkey}`)}>Ver ficha de la empresa</Button>
          </Box>
        </Box>
      ) : cargandoBorrador ? (
        <Typography sx={{ color: 'text.secondary' }}>Cargando borrador guardado...</Typography>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, pt: 2 }}>
            <Typography variant="h5">Formulario de Inscripción</Typography>
            {empresaId && (
              <Chip label="Borrador guardado" size="small"
                sx={{ bgcolor: 'rgba(94,156,122,0.12)', color: 'secondary.main', fontWeight: 600, fontSize: 11 }} />
            )}
          </Box>
          <Typography variant="subtitle1" sx={{ mb: 3 }}>Registra una nueva empresa cliente en Runa</Typography>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>{error}</Alert>}

          {/* ── PASO 0: Datos de Empresa ── */}
          {activeStep === 0 && (
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Empkey" fullWidth value={empkey} onChange={(e) => setEmpkey(e.target.value.replace(/\D/g, ''))} required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="RUT (76543210-8)" fullWidth value={rut} onChange={(e) => setRut(e.target.value)} required />
              </Grid>
              <Grid size={12}>
                <TextField label="Razón social" fullWidth value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} required />
              </Grid>
              <Grid size={12}>
                <TextField label="Nombre de fantasía (opcional)" fullWidth value={nombreFantasia} onChange={(e) => setNombreFantasia(e.target.value)} />
              </Grid>
            </Grid>
          )}

          {/* ── PASO 1: Representantes ── */}
          {activeStep === 1 && (
            <Box>
              <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 3 }}>
                Opcional. Agrega los Representantes Legales y Autorizados SII de la empresa.
              </Typography>

              {representantes.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
                  <Typography sx={{ fontSize: 13 }}>Sin representantes aún — haz clic en "Agregar representante" para comenzar.</Typography>
                </Box>
              )}

              {representantes.map((r, i) => (
                <Box key={i} sx={{ mb: 3 }}>
                  {/* Selector de tipo como chips clickeables */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {(['representante_legal', 'autorizado_sii'] as const).map((t) => (
                        <Chip key={t} label={ETIQUETA_TIPO[t]} size="small"
                          onClick={() => actualizarRepresentante(i, 'tipo', t)}
                          sx={{
                            cursor: 'pointer', fontWeight: 700, fontSize: 11,
                            bgcolor: r.tipo === t ? `${COLOR_TIPO[t]}18` : 'transparent',
                            color: r.tipo === t ? COLOR_TIPO[t] : 'text.disabled',
                            border: '1px solid',
                            borderColor: r.tipo === t ? COLOR_TIPO[t] : 'divider',
                            transition: 'all 0.15s',
                          }}
                        />
                      ))}
                    </Box>
                    <IconButton onClick={() => eliminarRepresentante(i)} size="small">
                      <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField label="RUT" fullWidth value={r.rut}
                        onChange={(e) => actualizarRepresentante(i, 'rut', e.target.value)}
                        error={r.rut.trim() !== '' && !RUT_REGEX.test(r.rut.trim())}
                        helperText={r.rut.trim() !== '' && !RUT_REGEX.test(r.rut.trim()) ? 'Formato: 76543210-8' : ''}
                        slotProps={{ input: { sx: { fontFamily: MONO_FONT, fontSize: 13 } } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 5 }}>
                      <TextField label="Nombre completo" fullWidth value={r.nombre_completo}
                        onChange={(e) => actualizarRepresentante(i, 'nombre_completo', e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <TextField select label="Estado" fullWidth value={r.estado}
                        onChange={(e) => actualizarRepresentante(i, 'estado', e.target.value)}
                        slotProps={{ select: { native: true } }}>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </TextField>
                    </Grid>
                  </Grid>
                  {i < representantes.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}

              <Button startIcon={<AddIcon />} onClick={agregarRepresentante} sx={{ mt: 1 }}>
                Agregar representante
              </Button>
            </Box>
          )}

          {/* ── PASO 2: Contactos ── */}
          {activeStep === 2 && (
            <Box>
              <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>
                No es obligatorio tener ambos tipos de contacto, pero debe existir al menos uno: Contraparte Técnica o Contacto de Facturación.
              </Typography>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Contraparte Técnica</Typography>
              {tecnicos.map((c, i) => (
                <Grid container spacing={2} key={i} sx={{ mb: 2, alignItems: 'center' }}>
                  <Grid size={{ xs: 12, sm: 5.5 }}><TextField label="Nombre" fullWidth value={c.nombre} onChange={(e) => actualizarContacto('tecnico', i, 'nombre', e.target.value)} /></Grid>
                  <Grid size={{ xs: 12, sm: 5.5 }}><TextField label="Apellido" fullWidth value={c.apellido} onChange={(e) => actualizarContacto('tecnico', i, 'apellido', e.target.value)} /></Grid>
                  <Grid size={{ xs: 12, sm: 1 }}><IconButton onClick={() => eliminarContacto('tecnico', i)} size="small"><DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} /></IconButton></Grid>
                  <Grid size={{ xs: 12, sm: 5.5 }}><TextField label="Correo" fullWidth value={c.correo} onChange={(e) => actualizarContacto('tecnico', i, 'correo', e.target.value)} /></Grid>
                  <Grid size={{ xs: 12, sm: 5.5 }}><TextField label="Teléfono" fullWidth value={c.telefono} onChange={(e) => actualizarContacto('tecnico', i, 'telefono', e.target.value)} /></Grid>
                </Grid>
              ))}
              <Button startIcon={<AddIcon />} onClick={() => agregarContacto('tecnico')} size="small" sx={{ mb: 3 }}>Agregar Contraparte Técnica</Button>
              <Divider sx={{ mb: 3 }} />
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Contacto de Facturación</Typography>
              {facturacion.map((c, i) => (
                <Grid container spacing={2} key={i} sx={{ mb: 2, alignItems: 'center' }}>
                  <Grid size={{ xs: 12, sm: 5.5 }}><TextField label="Nombre" fullWidth value={c.nombre} onChange={(e) => actualizarContacto('facturacion', i, 'nombre', e.target.value)} /></Grid>
                  <Grid size={{ xs: 12, sm: 5.5 }}><TextField label="Apellido" fullWidth value={c.apellido} onChange={(e) => actualizarContacto('facturacion', i, 'apellido', e.target.value)} /></Grid>
                  <Grid size={{ xs: 12, sm: 1 }}><IconButton onClick={() => eliminarContacto('facturacion', i)} size="small"><DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} /></IconButton></Grid>
                  <Grid size={{ xs: 12, sm: 5.5 }}><TextField label="Correo" fullWidth value={c.correo} onChange={(e) => actualizarContacto('facturacion', i, 'correo', e.target.value)} /></Grid>
                  <Grid size={{ xs: 12, sm: 5.5 }}><TextField label="Teléfono" fullWidth value={c.telefono} onChange={(e) => actualizarContacto('facturacion', i, 'telefono', e.target.value)} /></Grid>
                </Grid>
              ))}
              <Button startIcon={<AddIcon />} onClick={() => agregarContacto('facturacion')} size="small">Agregar Contacto de Facturación</Button>
            </Box>
          )}

          {/* ── PASO 3: Usuarios ── */}
          {activeStep === 3 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Usuarios con credenciales de acceso a la plataforma (opcional, puedes agregarlos después)
              </Typography>
              {usuarios.map((u, i) => (
                <Grid container spacing={2} key={i} sx={{ mb: 1.5, alignItems: 'center' }}>
                  <Grid size={{ xs: 12, sm: 4 }}><TextField label="RUT" fullWidth value={u.rut} onChange={(e) => actualizarUsuario(i, 'rut', e.target.value)} slotProps={{ input: { sx: { fontFamily: MONO_FONT, fontSize: 13 } } }} /></Grid>
                  <Grid size={{ xs: 12, sm: 6 }}><TextField label="Nombre completo" fullWidth value={u.nombre} onChange={(e) => actualizarUsuario(i, 'nombre', e.target.value)} /></Grid>
                  <Grid size={{ xs: 10, sm: 1.5 }}>
                    <TextField select label="Estado" fullWidth value={u.estado} onChange={(e) => actualizarUsuario(i, 'estado', e.target.value)} slotProps={{ select: { native: true } }}>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 2, sm: 0.5 }}><IconButton onClick={() => eliminarUsuario(i)} size="small"><DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} /></IconButton></Grid>
                </Grid>
              ))}
              <Button startIcon={<AddIcon />} onClick={agregarUsuario} sx={{ mt: 1 }}>Agregar usuario</Button>
            </Box>
          )}

          {/* ── PASO 4: Servicios ── */}
          {activeStep === 4 && (
            <ServiciosStep
              seleccionados={serviciosSeleccionados}
              onChangeSeleccionados={setServiciosSeleccionados}
              detalles={detallesServicios}
              onChangeDetalle={actualizarDetalleServicio}
            />
          )}

          {/* ── PASO 5: Resumen ── */}
          {activeStep === 5 && (
            <Box>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 3 }}>
                Revisa que todo esté correcto antes de guardar. Si algo está mal, usa "Atrás" para corregirlo.
              </Typography>

              <Card sx={{ p: 2.5, mb: 2 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>Datos de Empresa</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{razonSocial || '—'}</Typography>
                {nombreFantasia && <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Fantasía: {nombreFantasia}</Typography>}
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip label={`RUT ${rut || '—'}`} size="small" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                  <Chip label={`Empkey ${empkey || '—'}`} size="small" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                </Box>
              </Card>

              <Card sx={{ p: 2.5, mb: 2 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>
                  Representantes ({representantes.filter((r) => r.rut.trim()).length})
                </Typography>
                {representantes.filter((r) => r.rut.trim()).length === 0 ? (
                  <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>Sin representantes.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                    {representantes.filter((r) => r.rut.trim()).map((r, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={ETIQUETA_TIPO[r.tipo]} size="small"
                          sx={{ fontSize: 10, fontWeight: 700, height: 18, bgcolor: `${COLOR_TIPO[r.tipo]}18`, color: COLOR_TIPO[r.tipo] }} />
                        <Typography sx={{ fontSize: 12.5, fontFamily: MONO_FONT, color: 'secondary.main' }}>{r.rut}</Typography>
                        <Typography sx={{ fontSize: 12.5 }}>{r.nombre_completo}</Typography>
                        {r.estado === 'inactivo' && (
                          <Chip label="Inactivo" size="small"
                            sx={{ fontSize: 10, height: 16, bgcolor: 'rgba(180,180,180,0.15)', color: 'text.disabled' }} />
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Card>

              <Card sx={{ p: 2.5, mb: 2 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>Contactos</Typography>
                {tecnicos.filter((c) => c.nombre.trim()).length === 0 && facturacion.filter((c) => c.nombre.trim()).length === 0 ? (
                  <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>Sin contactos.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {tecnicos.filter((c) => c.nombre.trim()).map((c, i) => (
                      <Typography key={`t${i}`} sx={{ fontSize: 12.5 }}>
                        <Box component="span" sx={{ color: 'secondary.main', fontWeight: 600 }}>Técnica:</Box> {c.nombre} {c.apellido}
                      </Typography>
                    ))}
                    {facturacion.filter((c) => c.nombre.trim()).map((c, i) => (
                      <Typography key={`f${i}`} sx={{ fontSize: 12.5 }}>
                        <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>Facturación:</Box> {c.nombre} {c.apellido}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Card>

              <Card sx={{ p: 2.5, mb: 2 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>
                  Usuarios de la plataforma ({usuarios.length})
                </Typography>
                {usuarios.length === 0 ? (
                  <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>Sin usuarios.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                    {usuarios.map((u, i) => (
                      <Typography key={i} sx={{ fontSize: 12.5 }}>
                        {u.nombre} — <Box component="span" sx={{ fontFamily: MONO_FONT }}>{u.rut}</Box> ({u.estado})
                      </Typography>
                    ))}
                  </Box>
                )}
              </Card>

              <Card sx={{ p: 2.5, mb: 2 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1.5 }}>
                  Servicios Contratados ({serviciosSeleccionados.length})
                </Typography>
                {serviciosSeleccionados.length === 0 ? (
                  <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>Sin servicios.</Typography>
                ) : (
                  <Box>
                    {serviciosSeleccionados.map((codigo) => {
                      const info = SERVICIOS_INFO[codigo];
                      const Icono = ICONO_POR_CODIGO[codigo] ?? DescriptionOutlinedIcon;
                      const color = COLOR_POR_GRUPO[info?.grupo] ?? '#8B84A3';
                      const detalle = (detallesServicios as any)[codigo];
                      return (
                        <Accordion key={codigo} sx={{ mb: 1, '&:before': { display: 'none' } }} disableGutters>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, width: '100%' }}>
                              <Box sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: `${color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icono sx={{ fontSize: 14, color }} />
                              </Box>
                              <Typography sx={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: 'secondary.main' }}>{codigo}</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{info?.nombre ?? codigo}</Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <DetalleServicioView codigo={codigo} nombreServicio={info?.nombre ?? codigo} detalle={detalle}
                              documentosCalculadosBO={codigo === 'BO' ? computeDocumentosParaBO(detallesServicios as any) : undefined} />
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Box>
                )}
              </Card>
            </Box>
          )}

          {/* ── Navegación ── */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 5 }}>
            <Button onClick={irAtras} disabled={activeStep === 0 || guardandoPaso} sx={{ color: 'text.secondary' }}>
              Atrás
            </Button>

            {activeStep < steps.length - 1 ? (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                {/* Feedback de guardado exitoso */}
                {guardadoExitoso && (
                  <Typography sx={{ fontSize: 12, color: 'secondary.main', fontWeight: 600 }}>
                    ✓ Guardado
                  </Typography>
                )}
                {/* Guardar sin avanzar — solo en pasos con guardado incremental (0–3) */}
                {PASOS_CON_GUARDADO.includes(activeStep) && (
                  <Button
                    variant="outlined"
                    onClick={guardarSinAvanzar}
                    disabled={guardandoPaso}
                    sx={{ borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}
                  >
                    {guardandoPaso ? 'Guardando...' : 'Guardar'}
                  </Button>
                )}
                <Button variant="contained" onClick={irSiguiente} disabled={guardandoPaso}>
                  {guardandoPaso ? 'Guardando...' : PASOS_CON_GUARDADO.includes(activeStep) ? 'Guardar y continuar' : 'Continuar'}
                </Button>
              </Box>
            ) : (
              <Button variant="contained" disabled={guardandoPaso} onClick={handleGuardarFinal}>
                {guardandoPaso ? 'Guardando...' : 'Guardar empresa'}
              </Button>
            )}
          </Box>
        </>
      )}
      </Box>
    </Box>
  );
}