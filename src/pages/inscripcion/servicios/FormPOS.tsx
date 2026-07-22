import {
  Box, Typography, RadioGroup, FormControlLabel, Radio, Checkbox,
  TextField, Button, IconButton, Grid, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DeleteOutlined as DeleteOutlineIcon } from '@mui/icons-material';
import type { DetallePOS, Sucursal } from '../servicios-types';
import { DOCUMENTOS_NACIONALES, DOCUMENTOS_NO_TRIBUTARIOS } from '../servicios-types';

const NOMBRES_DOC: Record<string, string> = {
  '33': 'Factura Afecta', '34': 'Factura Exenta', '39': 'Boleta Afecta', '41': 'Boleta Exenta',
  '43': 'Liquidación de Factura', '46': 'Factura de Compra', '52': 'Guía de Despacho',
  '56': 'Nota de Débito', '61': 'Nota de Crédito',
  COM: 'Comanda', TNT: 'Ticket No Tributario',
};

const VERSIONES = ['LTS', 'LR', '2407', '2407N', '2503'] as const;
const EMISORES = ['V2503', 'V2408', 'EnternetAgenteWSv19', 'EnternetAgenteWS', 'ENTEmisorWSLR'] as const;

export const valorInicialPOS = (): DetallePOS => ({
  version: 'LTS',
  emisor: 'V2503',
  documentos: [],
  tieneSucursales: false,
  sucursales: [],
  cajasMatriz: null,
  modoFirma: 'controlada',
  empresaCombustible: false,
  membreteLocal: false,
  membreteLink: '',
});

type Props = {
  value?: DetallePOS;
  onChange: (v: DetallePOS) => void;
};

export function FormPOS({ value, onChange }: Props) {
  const v = { ...valorInicialPOS(), ...value };

  // Defensa: descarta cualquier entrada corrupta que haya quedado de un guardado anterior con error
  // (deben ser códigos de texto simples, ej. "33" — no objetos)
  const documentosValidos = v.documentos.filter((d): d is string => typeof d === 'string');

  function actualizar(cambios: Partial<DetallePOS>) {
    onChange({ ...v, documentos: documentosValidos, ...cambios });
  }

  function toggleDocumento(codigo: string) {
    const tiene = documentosValidos.includes(codigo);
    actualizar({ documentos: tiene ? documentosValidos.filter((d) => d !== codigo) : [...documentosValidos, codigo] });
  }

  function agregarSucursal() {
    actualizar({ sucursales: [...v.sucursales, { nombre: '', cajas: 1 }] });
  }

  function actualizarSucursal(index: number, campo: keyof Sucursal, valor: string | number) {
    const copia = [...v.sucursales];
    copia[index] = { ...copia[index], [campo]: valor };
    actualizar({ sucursales: copia });
  }

  function eliminarSucursal(index: number) {
    actualizar({ sucursales: v.sucursales.filter((_, i) => i !== index) });
  }

  return (
    <Box>
      {/* Versión (antes "Emisor") */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Versión</Typography>
      <RadioGroup row value={v.version} onChange={(e) => actualizar({ version: e.target.value as DetallePOS['version'] })} sx={{ mb: 2.5 }}>
        {VERSIONES.map((ver) => (
          <FormControlLabel key={ver} value={ver} control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12.5 }}>{ver}</Typography>} />
        ))}
      </RadioGroup>

      {/* Emisor (nuevo) */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Emisor</Typography>
      <RadioGroup row value={v.emisor} onChange={(e) => actualizar({ emisor: e.target.value as DetallePOS['emisor'] })} sx={{ mb: 2.5 }}>
        {EMISORES.map((em) => (
          <FormControlLabel key={em} value={em} control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12.5 }}>{em}</Typography>} />
        ))}
      </RadioGroup>

      {/* Tipo de DTE */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Tipo de DTE — Documentos Nacionales</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
        {DOCUMENTOS_NACIONALES.map((codigo) => (
          <FormControlLabel
            key={codigo}
            sx={{ mr: 1 }}
            control={<Checkbox size="small" checked={documentosValidos.includes(codigo)} onChange={() => toggleDocumento(codigo)} />}
            label={<Typography sx={{ fontSize: 12.5 }}>({codigo}) {NOMBRES_DOC[codigo]}</Typography>}
          />
        ))}
      </Box>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>Documentos No Tributarios</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 3 }}>
        {DOCUMENTOS_NO_TRIBUTARIOS.map((codigo) => (
          <FormControlLabel
            key={codigo}
            sx={{ mr: 1 }}
            control={<Checkbox size="small" checked={documentosValidos.includes(codigo)} onChange={() => toggleDocumento(codigo)} />}
            label={<Typography sx={{ fontSize: 12.5 }}>({codigo}) {NOMBRES_DOC[codigo]}</Typography>}
          />
        ))}
      </Box>

      <Divider sx={{ mb: 2.5 }} />

      {/* Sucursales */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>¿Tiene sucursales?</Typography>
      <RadioGroup
        row
        value={v.tieneSucursales ? 'si' : 'no'}
        onChange={(e) => actualizar({ tieneSucursales: e.target.value === 'si', sucursales: [], cajasMatriz: null })}
        sx={{ mb: 1.5 }}
      >
        <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
        <FormControlLabel value="no" control={<Radio size="small" />} label="No (Matriz)" />
      </RadioGroup>

      {v.tieneSucursales ? (
        <Box sx={{ pl: 1, borderLeft: '2px solid #EAE5F5', ml: 1, mb: 3 }}>
          {v.sucursales.map((s, i) => (
            <Grid container spacing={1.5} key={i} sx={{ mb: 1, alignItems: 'center' }}>
              <Grid size={7}>
                <TextField size="small" label="Nombre sucursal" fullWidth value={s.nombre} onChange={(e) => actualizarSucursal(i, 'nombre', e.target.value)} />
              </Grid>
              <Grid size={4}>
                <TextField
                  size="small" label="Cajas" type="number" fullWidth
                  value={s.cajas}
                  onChange={(e) => actualizarSucursal(i, 'cajas', Number(e.target.value))}
                />
              </Grid>
              <Grid size={1}>
                <IconButton size="small" onClick={() => eliminarSucursal(i)}>
                  <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          <Button startIcon={<AddIcon />} size="small" onClick={agregarSucursal}>Agregar sucursal</Button>
        </Box>
      ) : (
        <Box sx={{ mb: 3, maxWidth: 200 }}>
          <TextField
            size="small" label="Cantidad de cajas (Matriz)" type="number" fullWidth
            value={v.cajasMatriz ?? ''}
            onChange={(e) => actualizar({ cajasMatriz: Number(e.target.value) })}
          />
        </Box>
      )}

      <Divider sx={{ mb: 2.5 }} />

      {/* Modo de firma */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Modo de firma</Typography>
      <RadioGroup row value={v.modoFirma} onChange={(e) => actualizar({ modoFirma: e.target.value as 'ciega' | 'controlada' })} sx={{ mb: 2.5 }}>
        <FormControlLabel value="ciega" control={<Radio size="small" />} label="Ciega" />
        <FormControlLabel value="controlada" control={<Radio size="small" />} label="Controlada" />
      </RadioGroup>

      {/* Empresa de combustible */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>¿Es empresa de combustible?</Typography>
      <RadioGroup
        row
        value={v.empresaCombustible ? 'si' : 'no'}
        onChange={(e) => actualizar({ empresaCombustible: e.target.value === 'si' })}
        sx={{ mb: 2.5 }}
      >
        <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
        <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
      </RadioGroup>

      {/* Membrete local */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Membrete local</Typography>
      <RadioGroup
        row
        value={v.membreteLocal ? 'si' : 'no'}
        onChange={(e) => actualizar({ membreteLocal: e.target.value === 'si', membreteLink: '' })}
        sx={{ mb: 1.5 }}
      >
        <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
        <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
      </RadioGroup>
      {v.membreteLocal && (
        <TextField
          size="small" label="Link del membrete" fullWidth
          value={v.membreteLink}
          onChange={(e) => actualizar({ membreteLink: e.target.value })}
          sx={{ maxWidth: 380 }}
        />
      )}
    </Box>
  );
}