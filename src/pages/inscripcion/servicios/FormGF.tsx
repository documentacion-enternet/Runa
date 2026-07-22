import { Box, Typography } from '@mui/material';
import { CheckCircleOutlined as CheckCircleOutlineIcon } from '@mui/icons-material';

export function FormGF() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
      <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
        Gestor de Firma no tiene campos propios — su validación se hizo automáticamente al seleccionarlo,
        confirmando que la combinación de servicios calza con uno de los combos permitidos.
      </Typography>
    </Box>
  );
}