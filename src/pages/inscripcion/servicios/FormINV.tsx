import { Box, Typography } from '@mui/material';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';

export function FormINV() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
      <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
        Inventario no tiene campos de configuración adicionales — solo se registra como servicio contratado.
      </Typography>
    </Box>
  );
}