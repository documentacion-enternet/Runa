import { Box, Typography, TextField } from '@mui/material';
import type { DetalleRecAv } from '../servicios-types';

const valorInicial = (): DetalleRecAv => ({ casillaIntercambio: '' });

type Props = {
  value?: DetalleRecAv;
  onChange: (v: DetalleRecAv) => void;
};

export function FormRecAv({ value, onChange }: Props) {
  const v = { ...valorInicial(), ...value };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Casilla de intercambio</Typography>
      <TextField
        size="small"
        type="email"
        label="Correo electrónico"
        fullWidth
        value={v.casillaIntercambio}
        onChange={(e) => onChange({ casillaIntercambio: e.target.value })}
        sx={{ maxWidth: 380 }}
      />
    </Box>
  );
}