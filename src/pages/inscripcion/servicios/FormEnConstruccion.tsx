import { Box, Typography } from '@mui/material';

export function FormEnConstruccion({ codigo }: { codigo: string }) {
  return (
    <Box sx={{ py: 2 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
        El formulario de <strong>{codigo}</strong> lo construimos en el siguiente bloque de trabajo.
      </Typography>
    </Box>
  );
}