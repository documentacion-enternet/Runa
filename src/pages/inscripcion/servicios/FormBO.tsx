import { Box, Typography, TextField, Chip, Button, IconButton, Grid } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DeleteOutlined as DeleteOutlineIcon } from '@mui/icons-material';
import type { DetalleBO, DetallesServicios, TerminalBO, TerminalWSLocal } from '../servicios-types';

const NOMBRES_DOC: Record<string, string> = {
  '33': 'Factura Afecta', '34': 'Factura Exenta', '39': 'Boleta Afecta', '41': 'Boleta Exenta',
  '43': 'Liquidación de Factura', '46': 'Factura de Compra', '52': 'Guía de Despacho',
  '56': 'Nota de Débito', '61': 'Nota de Crédito',
  '110': 'Factura de Exportación', '111': 'Nota de Débito de Exportación', '112': 'Nota de Crédito de Exportación',
};

const valorInicial = (): DetalleBO => ({
  documentosAlmacenados: [],
  terminales: [],
  terminalesWSLocal: [],
  terminalesTxtV5: [],
});

type Props = {
  value?: DetalleBO;
  onChange: (v: DetalleBO) => void;
  detalles: DetallesServicios;
  seleccionados: string[];
};

export function FormBO({ value, onChange, detalles, seleccionados }: Props) {
  const v = { ...valorInicial(), ...value };

  // Folios que EF/EFP indicaron que se almacenan en BO (calculado, no editable aquí)
  const documentosDesdeEF = seleccionados.includes('EF') ? (detalles.EF?.documentos ?? []).filter((d) => d.almacenaEn.includes('BO')) : [];
  const documentosDesdeEFP = seleccionados.includes('EFP') ? (detalles.EFP?.documentos ?? []).filter((d) => d.almacenaEn.includes('BO')) : [];
  const documentosAlmacenados = [...documentosDesdeEF, ...documentosDesdeEFP];

  // Sucursales declaradas en POS / POS BOX
  const sucursalesPOS = seleccionados.includes('POS') ? (detalles.POS?.sucursales ?? []) : [];
  const sucursalesPOSBox = seleccionados.includes('POS BOX') ? (detalles['POS BOX']?.sucursales ?? []) : [];
  const todasLasSucursales = [...sucursalesPOS, ...sucursalesPOSBox];

  // Puntos de contingencia declarados en POS BOX
  const puntosContingencia =
    seleccionados.includes('POS BOX') && detalles['POS BOX']?.tieneContingencia
      ? detalles['POS BOX']?.puntosContingencia.filter((p) => p.trim() !== '') ?? []
      : [];

  // ¿La empresa tiene integración WS Local / TXT V5 en EF o EFP?
  const tieneWSLocal =
    (seleccionados.includes('EF') && detalles.EF?.integracion.tipoTransmision === 'WS_LOCAL') ||
    (seleccionados.includes('EFP') && detalles.EFP?.integracion.tipoTransmision === 'WS_LOCAL');

  const tieneTxtV5 =
    (seleccionados.includes('EF') && detalles.EF?.integracion.tipoTransmision === 'TXT_V5') ||
    (seleccionados.includes('EFP') && detalles.EFP?.integracion.tipoTransmision === 'TXT_V5');

  function actualizarTerminal(sucursal: string, campo: keyof TerminalBO, valor: string) {
    const existe = v.terminales.find((t) => t.nombre === sucursal);
    let nuevos: TerminalBO[];
    if (existe) {
      nuevos = v.terminales.map((t) => (t.nombre === sucursal ? { ...t, [campo]: valor } : t));
    } else {
      nuevos = [...v.terminales, { nombre: sucursal, terminalId: '', dispositivoId: '', [campo]: valor }];
    }
    onChange({ ...v, terminales: nuevos });
  }

  function agregarTerminalWSLocal() {
    onChange({ ...v, terminalesWSLocal: [...v.terminalesWSLocal, { nombreTerminal: '', terminalId: '', dispositivoId: '' }] });
  }

  function actualizarTerminalWSLocal(index: number, campo: keyof TerminalWSLocal, valor: string) {
    const copia = [...v.terminalesWSLocal];
    copia[index] = { ...copia[index], [campo]: valor };
    onChange({ ...v, terminalesWSLocal: copia });
  }

  function eliminarTerminalWSLocal(index: number) {
    onChange({ ...v, terminalesWSLocal: v.terminalesWSLocal.filter((_, i) => i !== index) });
  }

  function agregarTerminalTxtV5() {
    onChange({ ...v, terminalesTxtV5: [...v.terminalesTxtV5, { nombreTerminal: '', terminalId: '', dispositivoId: '' }] });
  }

  function actualizarTerminalTxtV5(index: number, campo: keyof TerminalWSLocal, valor: string) {
    const copia = [...v.terminalesTxtV5];
    copia[index] = { ...copia[index], [campo]: valor };
    onChange({ ...v, terminalesTxtV5: copia });
  }

  function eliminarTerminalTxtV5(index: number) {
    onChange({ ...v, terminalesTxtV5: v.terminalesTxtV5.filter((_, i) => i !== index) });
  }

  return (
    <Box>
      {/* Folios almacenados — calculado automáticamente */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Folios que almacena Back Office</Typography>
      {documentosAlmacenados.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>
          Aún no hay documentos asignados a BO — se calcula automáticamente según lo que definas en EF/EFP
          (campo "Reserva del folio" de cada documento).
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {documentosAlmacenados.map((d) => (
            <Chip key={d.codigo} label={`(${d.codigo}) ${NOMBRES_DOC[d.codigo]}`} size="small" sx={{ fontSize: 11 }} />
          ))}
        </Box>
      )}

      {/* Terminal ID + Dispositivo ID por sucursal */}
      {todasLasSucursales.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>Terminales por sucursal</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 1.5 }}>
            Ingresa el Terminal ID y el Dispositivo ID de cada sucursal definida en POS / POS BOX.
          </Typography>
          {todasLasSucursales.map((s) => (
            <Grid container spacing={1.5} key={s.nombre} sx={{ mb: 1.5, alignItems: 'center' }}>
              <Grid size={3}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{s.nombre}</Typography>
              </Grid>
              <Grid size={4}>
                <TextField
                  size="small" label="Terminal ID" fullWidth
                  value={v.terminales.find((t) => t.nombre === s.nombre)?.terminalId ?? ''}
                  onChange={(e) => actualizarTerminal(s.nombre, 'terminalId', e.target.value)}
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  size="small" label="Dispositivo ID" fullWidth
                  value={v.terminales.find((t) => t.nombre === s.nombre)?.dispositivoId ?? ''}
                  onChange={(e) => actualizarTerminal(s.nombre, 'dispositivoId', e.target.value)}
                />
              </Grid>
            </Grid>
          ))}
        </>
      )}

      {todasLasSucursales.length === 0 && (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>
          Cuando POS o POS BOX estén configurados con sucursales, aquí podrás asignar el Terminal ID y Dispositivo ID de cada una.
        </Typography>
      )}

      {/* Terminal ID + Dispositivo ID por punto de contingencia */}
      {puntosContingencia.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>Terminales por punto de contingencia</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 1.5 }}>
            Cada punto de contingencia declarado en POS BOX también necesita su Terminal ID y Dispositivo ID.
          </Typography>
          {puntosContingencia.map((nombre) => (
            <Grid container spacing={1.5} key={nombre} sx={{ mb: 1.5, alignItems: 'center' }}>
              <Grid size={3}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{nombre}</Typography>
              </Grid>
              <Grid size={4}>
                <TextField
                  size="small" label="Terminal ID" fullWidth
                  value={v.terminales.find((t) => t.nombre === nombre)?.terminalId ?? ''}
                  onChange={(e) => actualizarTerminal(nombre, 'terminalId', e.target.value)}
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  size="small" label="Dispositivo ID" fullWidth
                  value={v.terminales.find((t) => t.nombre === nombre)?.dispositivoId ?? ''}
                  onChange={(e) => actualizarTerminal(nombre, 'dispositivoId', e.target.value)}
                />
              </Grid>
            </Grid>
          ))}
        </>
      )}

      {/* Terminales WS Local */}
      {tieneWSLocal && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Terminales WS Local</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 1.5 }}>
            La empresa tiene integración WS Local — agrega el nombre, Terminal ID y Dispositivo ID de cada terminal.
          </Typography>
          {v.terminalesWSLocal.map((t, i) => (
            <Grid container spacing={1.5} key={i} sx={{ mb: 1, alignItems: 'center' }}>
              <Grid size={3}>
                <TextField
                  size="small" label="Nombre" fullWidth
                  value={t.nombreTerminal}
                  onChange={(e) => actualizarTerminalWSLocal(i, 'nombreTerminal', e.target.value)}
                />
              </Grid>
              <Grid size={3.5}>
                <TextField
                  size="small" label="Terminal ID" fullWidth
                  value={t.terminalId}
                  onChange={(e) => actualizarTerminalWSLocal(i, 'terminalId', e.target.value)}
                />
              </Grid>
              <Grid size={3.5}>
                <TextField
                  size="small" label="Dispositivo ID" fullWidth
                  value={t.dispositivoId ?? ''}
                  onChange={(e) => actualizarTerminalWSLocal(i, 'dispositivoId', e.target.value)}
                />
              </Grid>
              <Grid size={2}>
                <IconButton size="small" onClick={() => eliminarTerminalWSLocal(i)}>
                  <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          <Button startIcon={<AddIcon />} size="small" onClick={agregarTerminalWSLocal}>
            Agregar terminal WS Local
          </Button>
        </Box>
      )}

      {/* Terminales TXT V5 */}
      {tieneTxtV5 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Terminales TXT V5</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 1.5 }}>
            La empresa tiene integración TXT V5 (V23/V25) — agrega el nombre, Terminal ID y Dispositivo ID de cada terminal.
          </Typography>
          {v.terminalesTxtV5.map((t, i) => (
            <Grid container spacing={1.5} key={i} sx={{ mb: 1, alignItems: 'center' }}>
              <Grid size={3}>
                <TextField
                  size="small" label="Nombre" fullWidth
                  value={t.nombreTerminal}
                  onChange={(e) => actualizarTerminalTxtV5(i, 'nombreTerminal', e.target.value)}
                />
              </Grid>
              <Grid size={3.5}>
                <TextField
                  size="small" label="Terminal ID" fullWidth
                  value={t.terminalId}
                  onChange={(e) => actualizarTerminalTxtV5(i, 'terminalId', e.target.value)}
                />
              </Grid>
              <Grid size={3.5}>
                <TextField
                  size="small" label="Dispositivo ID" fullWidth
                  value={t.dispositivoId ?? ''}
                  onChange={(e) => actualizarTerminalTxtV5(i, 'dispositivoId', e.target.value)}
                />
              </Grid>
              <Grid size={2}>
                <IconButton size="small" onClick={() => eliminarTerminalTxtV5(i)}>
                  <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          <Button startIcon={<AddIcon />} size="small" onClick={agregarTerminalTxtV5}>
            Agregar terminal TXT V5
          </Button>
        </Box>
      )}
    </Box>
  );
}