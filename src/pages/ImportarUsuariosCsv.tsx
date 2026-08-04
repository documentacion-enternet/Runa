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

const RUT_REGEX = /^[0-9]{7,8}-[0-9kK]$/;

type FilaUsuario = {
  empkey: string;
  rut: string;
  nombre_completo: string;
  estado: string;
};

type UsuarioValidado = {
  empresa_id: string;
  empkey: number;
  rut: string;
  nombre: string;
  estado: 'activo' | 'inactivo';
  fecha_desde: string;
};

type UsuarioInvalido = {
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

export default function ImportarUsuariosCsv() {
  const navigate = useNavigate();
  const { puedeGestionar, perfil } = useAuth();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [paso, setPaso] = useState<'subir' | 'revisando' | 'revisado' | 'importando' | 'listo'>('subir');
  const [error, setError] = useState<string | null>(null);
  const [validos, setValidos] = useState<UsuarioValidado[]>([]);
  const [invalidos, setInvalidos] = useState<UsuarioInvalido[]>([]);
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
      const filas = await parsearCsv<FilaUsuario>(archivo);

      // Verificar columnas requeridas
      const primeraFila = filas[0] as Record<string, unknown> | undefined;
      if (primeraFila) {
        const columnas = Object.keys(primeraFila);
        const requeridas = ['empkey', 'rut', 'nombre_completo', 'estado'];
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

      const nuevosValidos: UsuarioValidado[] = [];
      const nuevosInvalidos: UsuarioInvalido[] = [];

      for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        const motivos: string[] = [];
        const empkeyNum = Number(fila.empkey);
        const estadoNorm = fila.estado?.toLowerCase().trim();

        if (!fila.empkey?.trim() || isNaN(empkeyNum)) {
          motivos.push('Empkey vacío o no numérico');
        } else if (!empkeyAId.has(empkeyNum)) {
          motivos.push(`Empkey ${fila.empkey} no existe en Runa`);
        }

        if (!fila.rut?.trim() || !RUT_REGEX.test(fila.rut.trim())) {
          motivos.push('RUT vacío o con formato inválido (debe ser 12345678-9)');
        }

        if (!fila.nombre_completo?.trim()) {
          motivos.push('Nombre completo vacío');
        }

        if (!estadoNorm || !['activo', 'inactivo'].includes(estadoNorm)) {
          motivos.push('Estado debe ser "activo" o "inactivo"');
        }

        if (motivos.length > 0) {
          nuevosInvalidos.push({ fila: i + 2, empkey: fila.empkey || '(vacío)', motivos });
          continue;
        }

        nuevosValidos.push({
          empresa_id: empkeyAId.get(empkeyNum)!,
          empkey: empkeyNum,
          rut: fila.rut.trim(),
          nombre: fila.nombre_completo.trim(),
          estado: estadoNorm as 'activo' | 'inactivo',
          fecha_desde: new Date().toISOString().split('T')[0],
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

    // Insertar en lotes de 50 para no saturar el plan gratuito de Supabase
    const LOTE = 50;
    for (let i = 0; i < validos.length; i += LOTE) {
      const lote = validos.slice(i, i + LOTE).map(u => ({
        empresa_id: u.empresa_id,
        rut: u.rut,
        nombre: u.nombre,
        estado: u.estado,
        fecha_desde: u.fecha_desde,
      }));

      const { error: errInsert } = await supabase.from('usuarios_activos').insert(lote);

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

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: 4, py: 4 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Importar usuarios activos por CSV</Typography>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Carga masiva de usuarios por empresa — cada fila se asocia a la empresa por su Empkey
      </Typography>

      {/* Plantilla descargable */}
      <Button
        size="small"
        variant="text"
        sx={{ mb: 3, color: 'text.secondary', textTransform: 'none', fontSize: 12.5 }}
        onClick={() => {
          const contenido = 'empkey,rut,nombre_completo,estado\n1001,12345678-9,Juan Pérez López,activo\n1002,98765432-1,María González Silva,inactivo\n';
          const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'plantilla-usuarios.csv';
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        ↓ Descargar plantilla CSV
      </Button>

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
              usuarios.csv
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
            Columnas esperadas: empkey, rut, nombre_completo, estado
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
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Chip
              label={`${validos.length} usuarios listos para importar`}
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
                    <TableCell>RUT</TableCell>
                    <TableCell>Nombre completo</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validos.map((u, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{u.empkey}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{u.rut}</TableCell>
                      <TableCell>{u.nombre}</TableCell>
                      <TableCell>
                        <Chip
                          label={u.estado}
                          size="small"
                          sx={{
                            bgcolor: u.estado === 'activo' ? 'rgba(94,156,122,0.14)' : 'rgba(180,180,180,0.18)',
                            color: u.estado === 'activo' ? 'secondary.main' : 'text.secondary',
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        />
                      </TableCell>
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
              Importar {validos.length} usuarios
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
            {resultado.creados} usuario{resultado.creados !== 1 ? 's' : ''} creado{resultado.creados !== 1 ? 's' : ''}
            {resultado.fallidos > 0 && ` — ${resultado.fallidos} fallaron al guardar`}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>Ir a Empresas</Button>
        </Box>
      )}
    </Box>
  );
}