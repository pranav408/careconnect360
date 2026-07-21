import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: {
      main: '#0F766E',
      light: '#2A9D96',
      dark: '#0A5550',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1565C0',
      light: '#3A86D6',
      dark: '#0D47A1',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#3F51B5',
      light: '#6574CD',
      dark: '#2C3A8C',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#2E7D32',
    },
    warning: {
      main: '#ED9A00',
    },
    error: {
      main: '#C62828',
    },
    background: {
      default: '#EEF3F8',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1D2A38',
      secondary: '#4A5A6A',
    },
    divider: '#D6E2EC',
  },
  shape: {
    borderRadius: 14,
  },
  spacing: 8,
  typography: {
    fontFamily:
      "'Segoe UI', 'SF Pro Text', 'Helvetica Neue', Arial, system-ui, sans-serif",
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '1.625rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.35rem',
      fontWeight: 700,
    },
    h4: {
      fontSize: '1.15rem',
      fontWeight: 700,
    },
    body1: {
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'radial-gradient(circle at 15% 0%, rgba(21, 101, 192, 0.12), transparent 34%), radial-gradient(circle at 100% 0%, rgba(15, 118, 110, 0.1), transparent 30%), #EEF3F8',
          color: '#1D2A38',
        },
        '#root': {
          minHeight: '100vh',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: '0 10px 28px rgba(16, 42, 67, 0.08)',
          border: '1px solid rgba(214, 226, 236, 0.8)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          minHeight: 44,
        },
        contained: {
          boxShadow: '0 8px 18px rgba(15, 118, 110, 0.28)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2A9D96',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: '1px solid rgba(214, 226, 236, 0.85)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 14,
        },
      },
    },
  },
})
