import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, Alert, LinearProgress, Chip,
  Table, TableHead, TableBody, TableRow, TableCell,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Papa from 'papaparse';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPOS_VALIDOS = ['tecnico', 'facturacion'];

type FilaContacto = {
  empkey: string;
  tipo: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
};

type ContactoValidado = {
  empresa_id: string;
  empkey: number;
  tipo: 'tecnico' | 'facturacion';
  nombre: string;
  apellido: string;
  correo: string | null;
  telefono: string | null;
};

type ContactoInvalido = {
  fila: number;
  empkey: string;
  motivos: string[];
};

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

export default function ImportarContactosCsv() {
  const navigate = useNavigate();
  const { puedeGestionar, perfil } = useAuth();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [paso, setPaso] = useState<'subir' | 'revisando' | 'revisado' | 'importando' | 'listo'>('subir');
  const [error, setError] = useState<string | null>(null);
  const [validos, setValidos] = useState<ContactoValidado[]>([]);
  const [invalidos, setInvalidos] = useState<ContactoInvalido[]>([]);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [resultado, setResultado] = useState<{ creados: number; fallidos: number } | null>(null);

  // Bloqueo de acceso — solo admin y lider
  if (perfil && !puedeGestionar) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 4, py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: '8px' }}>
          Esta sección es exclusiva para Administradores y Líderes de equipo.
        </Alert>
      </Box>
    );
  }

  async function revisar() {
    if (!archivo) {
      setError('Debes seleccionar un archivo CSV');
      return;
    }
    setError(null);
    setPaso('revisando');

    try {
      const filas = await parsearCsv<FilaContacto>(archivo);

      // Verificar columnas requeridas
      const primeraFila = filas[0] as Record<string, unknown> | undefined;
      if (primeraFila) {
        const columnas = Object.keys(primeraFila);
        const requeridas = ['empkey', 'tipo', 'nombre', 'apellido'];
        const faltantes = requeridas.filter(c => !columnas.includes(c));
        if (faltantes.length > 0) {
          setError(`Columnas faltantes en el CSV: ${faltantes.join(', ')}`);
          setPaso('subir');
          return;
        }
      }

      if (filas.length === 0) {
        setError('El archivo no tiene filas de datos.');
        setPaso('subir');
        return;
      }

      // Traer todos los empkeys válidos en una sola consulta
      const empkeysEnArchivo = [...new Set(filas.map(f => Number(f.empkey)).filter(n => !isNaN(n)))];
      const { data: empresas } = await supabase
        .from('empresas')
        .select('id, empkey')
        .in('empkey', empkeysEnArchivo);

      const empkeyAId = new Map((empresas ?? []).map(e => [e.empkey, e.id]));

      const nuevosValidos: ContactoValidado[] = [];
      const nuevosInvalidos: ContactoInvalido[] = [];

      for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        const motivos: string[] = [];
        const empkeyNum = Number(fila.empkey);
        const tipoNorm = fila.tipo?.toLowerCase().trim();
        const correoTrim = fila.correo?.trim() || '';
        const telefonoTrim = fila.telefono?.trim() || '';

        if (!fila.empkey?.trim() || isNaN(empkeyNum)) {
          motivos.push('Empkey vacío o no numérico');
        } else if (!empkeyAId.has(empkeyNum)) {
          motivos.push(`Empkey ${fila.empkey} no existe en Runa`);
        }

        if (!tipoNorm || !TIPOS_VALIDOS.includes(tipoNorm)) {
          motivos.push('Tipo debe ser "tecnico" o "facturacion"');
        }

        if (!fila.nombre?.trim()) {
          motivos.push('Nombre vacío');
        }

        if (!fila.apellido?.trim()) {
          motivos.push('Apellido vacío');
        }

        if (correoTrim && !EMAIL_REGEX.test(correoTrim)) {
          motivos.push('Correo con formato inválido');
        }

        if (motivos.length > 0) {
          nuevosInvalidos.push({ fila: i + 2, empkey: fila.empkey || '(vacío)', motivos });
          continue;
        }

        nuevosValidos.push({
          empresa_id: empkeyAId.get(empkeyNum)!,
          empkey: empkeyNum,
          tipo: tipoNorm as 'tecnico' | 'facturacion',
          nombre: fila.nombre.trim(),
          apellido: fila.apellido.trim(),
          correo: correoTrim || null,
          telefono: telefonoTrim || null,
        });
      }

      setValidos(nuevosValidos);
      setInvalidos(nuevosInvalidos);
      setPaso('revisado');
    } catch (err) {
      setError('Error al leer el archivo: ' + String(err));
      setPaso('subir');
    }
  }

  async function importar() {
    setPaso('importando');
    setProgreso({ actual: 0, total: validos.length });
    let creados = 0;
    let fallidos = 0;

    // Insertar en lotes de 50
    const LOTE = 50;
    for (let i = 0; i < validos.length; i += LOTE) {
      const lote = validos.slice(i, i + LOTE).map(c => ({
        empresa_id: c.empresa_id,
        tipo: c.tipo,
        nombre: c.nombre,
        apellido: c.apellido,
        correo: c.correo,
        telefono: c.telefono,
      }));

      const { error: errInsert } = await supabase.from('contactos').insert(lote);

      if (errInsert) {
        fallidos += lote.length;
      } else {
        creados += lote.length;
      }

      setProgreso((p) => ({ ...p, actual: Math.min(i + LOTE, validos.length) }));
    }

    setResultado({ creados, fallidos });
    setPaso('listo');
  }

  const etiquetaTipo = (tipo: string) =>
    tipo === 'tecnico' ? 'Contraparte Técnica' : 'Contacto de Facturación';

  const colorTipo = (tipo: string) =>
    tipo === 'tecnico'
      ? { bgcolor: 'rgba(94,156,122,0.14)', color: 'secondary.main' }
      : { bgcolor: 'rgba(122,107,176,0.14)', color: 'primary.main' };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: 4, py: 4 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Importar contactos por CSV</Typography>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Carga masiva de Contrapartes Técnicas y Contactos de Facturación — cada fila se asocia a la empresa por su Empkey
      </Typography>

      {/* Plantilla descargable */}
      <Button
        size="small"
        variant="text"
        sx={{ mb: 3, color: 'text.secondary', textTransform: 'none', fontSize: 12.5 }}
        onClick={() => {
          const contenido = [
            'empkey,tipo,nombre,apellido,correo,telefono',
            '1001,tecnico,Juan Carlos,Gallegillos,jcarlosmg1@gmail.com,+56992382287',
            '1001,facturacion,Julieta,Ortiz,asistentecontable@empresa.cl,+56224000605',
            '1002,tecnico,Pedro,Soto,,',
          ].join('\n') + '\n';
          const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'plantilla-contactos.csv';
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        ↓ Descargar plantilla CSV
      </Button>

      <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 3, mt: -2 }}>
        correo y telefono son opcionales. tipo acepta: tecnico · facturacion
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Paso 1: Subir */}
      {paso === 'subir' && (
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileOutlinedIcon />}
              sx={{ minWidth: 200 }}
            >
              contactos.csv
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
            </Button>
            {archivo && (
              <Chip
                label={archivo.name}
                size="small"
                sx={{ bgcolor: 'rgba(94,156,122,0.12)', color: 'secondary.main' }}
              />
            )}
          </Box>
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>
            Columnas esperadas: empkey, tipo, nombre, apellido, correo, telefono
          </Typography>
          <Button variant="contained" onClick={revisar}>
            Revisar antes de importar
          </Button>
        </Card>
      )}

      {/* Paso 2: Revisando */}
      {paso === 'revisando' && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography sx={{ color: 'text.secondary' }}>Revisando archivo y verificando empkeys...</Typography>
        </Box>
      )}

      {/* Paso 3: Revisado — preview + confirmación */}
      {paso === 'revisado' && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Chip
              label={`${validos.length} contactos listos para importar`}
              sx={{ bgcolor: 'rgba(94,156,122,0.14)', color: 'secondary.main', fontWeight: 700 }}
            />
            {invalidos.length > 0 && (
              <Chip
                label={`${invalidos.length} con errores (no se importarán)`}
                sx={{ bgcolor: 'rgba(199,123,134,0.14)', color: '#A85F6A', fontWeight: 700 }}
              />
            )}
          </Box>

          {invalidos.length > 0 && (
            <Accordion sx={{ mb: 3 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Ver detalle de errores</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {invalidos.map((inv, i) => (
                  <Box key={i} sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                      Fila {inv.fila} — Empkey {inv.empkey}
                    </Typography>
                    {inv.motivos.map((m, j) => (
                      <Typography key={j} sx={{ fontSize: 12, color: 'text.secondary' }}>— {m}</Typography>
                    ))}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {validos.length > 0 && (
            <Card sx={{ overflow: 'auto', mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Empkey</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Apellido</TableCell>
                    <TableCell>Correo</TableCell>
                    <TableCell>Teléfono</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validos.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{c.empkey}</TableCell>
                      <TableCell>
                        <Chip
                          label={etiquetaTipo(c.tipo)}
                          size="small"
                          sx={{ ...colorTipo(c.tipo), fontWeight: 600, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell>{c.nombre}</TableCell>
                      <TableCell>{c.apellido}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{c.correo || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{c.telefono || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button onClick={() => setPaso('subir')} sx={{ color: 'text.secondary' }}>
              Volver a subir archivo
            </Button>
            <Button
              variant="contained"
              disabled={validos.length === 0}
              onClick={importar}
            >
              Importar {validos.length} contactos
            </Button>
          </Box>
        </Box>
      )}

      {/* Paso 4: Importando */}
      {paso === 'importando' && (
        <Box sx={{ py: 4 }}>
          <Typography sx={{ mb: 1.5 }}>
            Importando {progreso.actual} / {progreso.total}...
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(progreso.actual / Math.max(progreso.total, 1)) * 100}
            sx={{
              height: 6,
              borderRadius: 999,
              bgcolor: '#EAE5F5',
              '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: 'primary.main' },
            }}
          />
        </Box>
      )}

      {/* Paso 5: Listo */}
      {paso === 'listo' && resultado && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Importación terminada</Typography>
          <Typography sx={{ color: 'text.secondary', mb: 3 }}>
            {resultado.creados} contacto{resultado.creados !== 1 ? 's' : ''} creado{resultado.creados !== 1 ? 's' : ''}
            {resultado.fallidos > 0 && ` — ${resultado.fallidos} fallaron al guardar`}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>Ir a Empresas</Button>
        </Box>
      )}
    </Box>
  );
}