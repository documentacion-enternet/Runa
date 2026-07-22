import { Box, Typography, TextField } from '@mui/material';
import type { DetalleDteProv } from '../servicios-types';

const valorInicial = (): DetalleDteProv => ({ casillaIntercambio: '' });

type Props = {
  value?: DetalleDteProv;
  onChange: (v: DetalleDteProv) => void;
};

export function FormDteProv({ value, onChange }: Props) {
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