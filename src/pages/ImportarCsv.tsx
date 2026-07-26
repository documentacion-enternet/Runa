import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, Alert, LinearProgress, Chip,
  Table, TableHead, TableBody, TableRow, TableCell, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Papa from 'papaparse';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const RUT_REGEX = /^[0-9]{7,8}-[0-9kK]$/;

type FilaEmpresa = { empkey: string; rut: string; razon_social: string; nombre_fantasia: string };

type EmpresaValidada = {
  empkey: number;
  rut: string;
  razon_social: string;
  nombre_fantasia: string;
};

type EmpresaInvalida = { empkey: string; motivos: string[] };

function parsearCsv<T>(archivo: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(archivo, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (v) => v.trim(),
      complete: (res) => resolve(res.data),
      error: reject,
    });
  });
}

export default function ImportarCsv() {
  const navigate = useNavigate();
  const { session, perfil } = useAuth();

  const [archivoEmpresas, setArchivoEmpresas] = useState<File | null>(null);
  const [paso, setPaso] = useState<'subir' | 'revisando' | 'revisado' | 'importando' | 'listo'>('subir');
  const [error, setError] = useState<string | null>(null);
  const [validas, setValidas] = useState<EmpresaValidada[]>([]);
  const [invalidas, setInvalidas] = useState<EmpresaInvalida[]>([]);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [resultado, setResultado] = useState<{ creadas: number; fallidas: number } | null>(null);

  async function revisar() {
    if (!archivoEmpresas) {
      setError('Debes seleccionar el archivo empresas.csv');
      return;
    }
    setError(null);
    setPaso('revisando');

    try {
      const filas = await parsearCsv<FilaEmpresa>(archivoEmpresas);

      const { data: empresasExistentes } = await supabase.from('empresas').select('empkey');
      const empkeysExistentes = new Set((empresasExistentes ?? []).map((e) => e.empkey));

      const empkeysEnArchivo = new Set<string>();
      const nuevasValidas: EmpresaValidada[] = [];
      const nuevasInvalidas: EmpresaInvalida[] = [];

      for (const fila of filas) {
        const motivos: string[] = [];
        const empkeyTexto = (fila.empkey || '').trim();

        if (!empkeyTexto || isNaN(Number(empkeyTexto))) motivos.push('Empkey vacío o no numérico');
        if (empkeysEnArchivo.has(empkeyTexto)) motivos.push('Empkey repetido dentro del mismo archivo');
        if (empkeysExistentes.has(Number(empkeyTexto))) motivos.push('Ya existe una empresa con ese Empkey en Runa');
        if (!fila.rut?.trim() || !RUT_REGEX.test(fila.rut.trim())) motivos.push('RUT vacío o con formato inválido (debe ser 12345678-9)');
        if (!fila.razon_social?.trim()) motivos.push('Razón social vacía');

        empkeysEnArchivo.add(empkeyTexto);

        if (motivos.length > 0) {
          nuevasInvalidas.push({ empkey: empkeyTexto || '(vacío)', motivos });
          continue;
        }

        nuevasValidas.push({
          empkey: Number(empkeyTexto),
          rut: fila.rut.trim(),
          razon_social: fila.razon_social.trim(),
          nombre_fantasia: fila.nombre_fantasia?.trim() || '',
        });
      }

      setValidas(nuevasValidas);
      setInvalidas(nuevasInvalidas);
      setPaso('revisado');
    } catch (err) {
      setError('Error al leer el archivo: ' + String(err));
      setPaso('subir');
    }
  }

  async function importar() {
    setPaso('importando');
    setProgreso({ actual: 0, total: validas.length });
    let creadas = 0;
    let fallidas = 0;

    for (const empresa of validas) {
      const { error: errEmpresa } = await supabase.from('empresas').insert({
        empkey: empresa.empkey,
        rut: empresa.rut,
        razon_social: empresa.razon_social,
        nombre_fantasia: empresa.nombre_fantasia || null,
        completado: false,        // entra como borrador — le faltan contactos, usuarios y servicios
        estado_empresa: 'activa',
        creado_por: session?.user.id,
        // asignado_a se deja sin definir — se reparte después desde el portal
      });

      if (errEmpresa) fallidas++;
      else creadas++;

      setProgreso((p) => ({ ...p, actual: p.actual + 1 }));
    }

    setResultado({ creadas, fallidas });
    setPaso('listo');
  }

  // Bloqueo de acceso — exclusivo para admin
  if (perfil && perfil.rol !== 'admin') {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 4, py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: '8px' }}>
          Esta sección es exclusiva para administradores.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: 4, py: 4 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Importar empresas por CSV</Typography>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Carga masiva de datos básicos — las empresas entran como borradores para completar contactos, usuarios y servicios después
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }} onClose={() => setError(null)}>{error}</Alert>}

      {paso === 'subir' && (
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Button component="label" variant="outlined" startIcon={<UploadFileOutlinedIcon />} sx={{ minWidth: 200 }}>
              empresas.csv
              <input type="file" accept=".csv" hidden onChange={(e) => setArchivoEmpresas(e.target.files?.[0] ?? null)} />
            </Button>
            {archivoEmpresas && (
              <Chip label={archivoEmpresas.name} size="small" sx={{ bgcolor: 'rgba(94,156,122,0.12)', color: 'secondary.main' }} />
            )}
          </Box>
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>
            Columnas esperadas: empkey, rut, razon_social, nombre_fantasia
          </Typography>
          <Button variant="contained" onClick={revisar}>
            Revisar antes de importar
          </Button>
        </Card>
      )}

      {paso === 'revisando' && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography sx={{ color: 'text.secondary' }}>Revisando archivo...</Typography>
        </Box>
      )}

      {paso === 'revisado' && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Chip
              label={`${validas.length} empresas listas para importar`}
              sx={{ bgcolor: 'rgba(94,156,122,0.14)', color: 'secondary.main', fontWeight: 700 }}
            />
            {invalidas.length > 0 && (
              <Chip
                label={`${invalidas.length} con errores (no se importarán)`}
                sx={{ bgcolor: 'rgba(199,123,134,0.14)', color: '#A85F6A', fontWeight: 700 }}
              />
            )}
          </Box>

          {invalidas.length > 0 && (
            <Accordion sx={{ mb: 3 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Ver detalle de errores</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {invalidas.map((inv, i) => (
                  <Box key={i} sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>Empkey {inv.empkey}</Typography>
                    {inv.motivos.map((m, j) => (
                      <Typography key={j} sx={{ fontSize: 12, color: 'text.secondary' }}>— {m}</Typography>
                    ))}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {validas.length > 0 && (
            <Card sx={{ overflow: 'auto', mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Empkey</TableCell>
                    <TableCell>Razón social</TableCell>
                    <TableCell>Nombre fantasía</TableCell>
                    <TableCell>RUT</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validas.map((e) => (
                    <TableRow key={e.empkey}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{e.empkey}</TableCell>
                      <TableCell>{e.razon_social}</TableCell>
                      <TableCell>{e.nombre_fantasia || '—'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{e.rut}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button onClick={() => setPaso('subir')} sx={{ color: 'text.secondary' }}>Volver a subir archivo</Button>
            <Button variant="contained" disabled={validas.length === 0} onClick={importar}>
              Importar {validas.length} empresas
            </Button>
          </Box>
        </Box>
      )}

      {paso === 'importando' && (
        <Box sx={{ py: 4 }}>
          <Typography sx={{ mb: 1.5 }}>Importando {progreso.actual} / {progreso.total}...</Typography>
          <LinearProgress
            variant="determinate"
            value={(progreso.actual / Math.max(progreso.total, 1)) * 100}
            sx={{ height: 6, borderRadius: 999, bgcolor: '#EAE5F5', '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: 'primary.main' } }}
          />
        </Box>
      )}

      {paso === 'listo' && resultado && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Importación terminada</Typography>
          <Typography sx={{ color: 'text.secondary', mb: 3 }}>
            {resultado.creadas} empresas creadas como borradores
            {resultado.fallidas > 0 && ` — ${resultado.fallidas} fallaron al guardar`}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>Ir a Empresas</Button>
        </Box>
      )}
    </Box>
  );
}