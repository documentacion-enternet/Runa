import { Box, Typography, RadioGroup, FormControlLabel, Radio, TextField, Button, IconButton, Grid, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DeleteOutlined as DeleteOutlineIcon } from '@mui/icons-material';
import type { DetallePOSBox } from '../servicios-types';
import { FormPOS, valorInicialPOS } from './FormPOS';

const valorInicial = (): DetallePOSBox => ({
  ...valorInicialPOS(),
  tipoPi: 'PI3',
  dispositivos: [],
  jksEnBox: false,
  tieneContingencia: false,
  puntosContingencia: [],
});

type Props = {
  value?: DetallePOSBox;
  onChange: (v: DetallePOSBox) => void;
};

export function FormPOSBox({ value, onChange }: Props) {
  const v = { ...valorInicial(), ...value };

  function actualizar(cambios: Partial<DetallePOSBox>) {
    onChange({ ...v, ...cambios });
  }

  function actualizarDispositivo(sucursal: string, dispositivoId: string) {
    const existe = v.dispositivos.find((d) => d.sucursal === sucursal);
    const nuevos = existe
      ? v.dispositivos.map((d) => (d.sucursal === sucursal ? { ...d, dispositivoId } : d))
      : [...v.dispositivos, { sucursal, dispositivoId }];
    actualizar({ dispositivos: nuevos });
  }

  function agregarPuntoContingencia() {
    actualizar({ puntosContingencia: [...v.puntosContingencia, ''] });
  }

  function actualizarPuntoContingencia(index: number, valor: string) {
    const copia = [...v.puntosContingencia];
    copia[index] = valor;
    actualizar({ puntosContingencia: copia });
  }

  function eliminarPuntoContingencia(index: number) {
    actualizar({ puntosContingencia: v.puntosContingencia.filter((_, i) => i !== index) });
  }

  return (
    <Box>
      {/* Reutiliza todos los campos de POS (emisor, DTE, sucursales, firma, combustible, membrete) */}
      <FormPOS value={v} onChange={(campos) => actualizar(campos)} />

      <Divider sx={{ my: 2.5 }} />

      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Configuración Enterbox</Typography>

      {/* Tipo de PI */}
      <Typography sx={{ fontSize: 12.5, mb: 0.5, color: 'text.secondary' }}>Tipo de PI</Typography>
      <RadioGroup row value={v.tipoPi} onChange={(e) => actualizar({ tipoPi: e.target.value as 'PI3' | 'PI4' })} sx={{ mb: 2.5 }}>
        <FormControlLabel value="PI3" control={<Radio size="small" />} label="PI3" />
        <FormControlLabel value="PI4" control={<Radio size="small" />} label="PI4" />
      </RadioGroup>

      {/* Dispositivo ID — uno por sucursal declarada en POS */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Dispositivo ID por sucursal</Typography>
      {v.sucursales.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2.5 }}>
          Primero declara las sucursales arriba (sección "¿Tiene sucursales?") — aquí podrás asignar el Dispositivo ID de cada una.
        </Typography>
      ) : (
        <Box sx={{ mb: 2.5 }}>
          {v.sucursales.map((s) => (
            <Box key={s.nombre} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography sx={{ fontSize: 12.5, width: 160 }}>{s.nombre || '(sin nombre)'}</Typography>
              <TextField
                size="small"
                label="Dispositivo ID"
                value={v.dispositivos.find((d) => d.sucursal === s.nombre)?.dispositivoId ?? ''}
                onChange={(e) => actualizarDispositivo(s.nombre, e.target.value)}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* JKS en BOX */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>¿Tiene JKS en BOX?</Typography>
      <RadioGroup
        row
        value={v.jksEnBox ? 'si' : 'no'}
        onChange={(e) => actualizar({ jksEnBox: e.target.value === 'si' })}
        sx={{ mb: 2.5 }}
      >
        <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
        <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
      </RadioGroup>

      {/* Punto(s) de contingencia */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>¿Tiene puntos de contingencia?</Typography>
      <RadioGroup
        row
        value={v.tieneContingencia ? 'si' : 'no'}
        onChange={(e) => actualizar({ tieneContingencia: e.target.value === 'si', puntosContingencia: [] })}
        sx={{ mb: 1.5 }}
      >
        <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
        <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
      </RadioGroup>

      {v.tieneContingencia && (
        <Box sx={{ pl: 1, borderLeft: '2px solid #EAE5F5', ml: 1 }}>
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 1 }}>
            Depende de cuántos Enterbox de contingencia tenga la sucursal — puedes agregar más de uno.
          </Typography>
          {v.puntosContingencia.map((nombre, i) => (
            <Grid container spacing={1.5} key={i} sx={{ mb: 1, alignItems: 'center' }}>
              <Grid size={9}>
                <TextField
                  size="small" label={`Nombre punto de contingencia ${i + 1}`} fullWidth
                  value={nombre}
                  onChange={(e) => actualizarPuntoContingencia(i, e.target.value)}
                />
              </Grid>
              <Grid size={1}>
                <IconButton size="small" onClick={() => eliminarPuntoContingencia(i)}>
                  <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          <Button startIcon={<AddIcon />} size="small" onClick={agregarPuntoContingencia}>
            Agregar punto de contingencia
          </Button>
        </Box>
      )}
    </Box>
  );
}