import { createTheme } from '@mui/material/styles';

/* ---------------------------------------------------------------
   RUNA — Design tokens (ver conversación de diseño)
   Ink       #3B3358  texto principal / headers
   Canvas    #F7F5FB  fondo de la app
   Surface   #FFFFFF  tarjetas / superficies
   Line      #EAE5F5  bordes
   Accent    #7A6BB0  morado pastel — acciones, foco
   Data      #5E9C7C  verde salvia — SOLO para RUT / códigos de servicio
   Status:   activo #5E9C7C · suspendido #C9A15A · cancelado #C77B86
   Type:     Manrope (UI) + IBM Plex Mono (datos/códigos)
------------------------------------------------------------------*/

// Fuente monoespaciada para RUT, Empkey y códigos de servicio (EF, EFP, POS...).
// Úsala directamente en el sx de esos textos puntuales:
// <Typography sx={{ fontFamily: MONO_FONT }}>76.543.210-8</Typography>
export const MONO_FONT = "'IBM Plex Mono', monospace";

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#7A6BB0',       // Accent — botones, foco, elementos interactivos
      light: '#9C90CC',
      dark: '#695A9E',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#5E9C7C',       // Data — RUT, códigos, y también "activo"
      light: '#7FB596',
      dark: '#4C8467',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#5E9C7C',       // activo
    },
    warning: {
      main: '#C9A15A',       // suspendido
    },
    error: {
      main: '#C77B86',       // cancelado (rosa empolvado, no rojo saturado)
    },
    background: {
      default: '#F7F5FB',    // Canvas
      paper: '#FFFFFF',      // Surface
    },
    text: {
      primary: '#3B3358',    // Ink
      secondary: '#76708C',  // gris-lavanda para subtítulos/labels
      disabled: '#9C93B5',
    },
    divider: '#EAE5F5',      // Line
  },

  typography: {
    fontFamily: "'Manrope', sans-serif",
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700, fontSize: '19px' },
    h6: { fontWeight: 700 },
    subtitle1: { color: '#8B84A3', fontSize: '13px' },
    subtitle2: { color: '#8B84A3', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' },
    body1: { fontSize: '14px', color: '#463F63' },
    body2: { fontSize: '13px', color: '#463F63' },
    button: { fontWeight: 600, textTransform: 'none' }, // sin mayúsculas forzadas (default de MUI)
  },

  shape: {
    borderRadius: 10,
  },

  components: {
    // Tarjetas: borde sutil en vez de sombra pesada, para el look minimalista
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #EAE5F5',
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // evita el overlay de elevación que oscurece el fondo
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 999,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& fieldset': { borderColor: '#EAE5F5' },
          '&:hover fieldset': { borderColor: '#7A6BB0' },
          '&.Mui-focused fieldset': { borderColor: '#7A6BB0' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: '10.5px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#8B84A3',
          backgroundColor: '#FAF8FD',
          borderBottom: '1px solid #EAE5F5',
        },
        body: {
          fontSize: '13px',
          color: '#463F63',
          borderBottom: '1px solid #EAE5F5',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#3B3358',
          boxShadow: 'none',
          borderBottom: '1px solid #EAE5F5',
        },
      },
    },
  },
});