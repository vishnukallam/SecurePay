import { createTheme } from '@mui/material';
import type { PaletteMode } from '@mui/material';

export const getTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#a8c7fa' : '#0b57d0', // Google Pay Blue
        light: isDark ? '#c2e7ff' : '#d3e3fd',
        dark: isDark ? '#0842a0' : '#041e49',
        contrastText: isDark ? '#041e49' : '#ffffff',
      },
      secondary: {
        main: isDark ? '#c5c6d0' : '#5b5e66',
        light: isDark ? '#e1e2ec' : '#f1f3f9',
        dark: isDark ? '#44474e' : '#1a1c1e',
      },
      background: {
        default: isDark ? '#0f1115' : '#f8f9fd',
        paper: isDark ? '#1a1d24' : '#ffffff',
      },
      text: {
        primary: isDark ? '#e3e2e6' : '#1f1f1f',
        secondary: isDark ? '#c5c6d0' : '#5f6368',
      },
      success: {
        main: isDark ? '#6dd58c' : '#146c36', // Vibrant Safe Green
      },
      error: {
        main: isDark ? '#ffb4ab' : '#ba1a1a', // Warning Red
      },
      warning: {
        main: isDark ? '#fbc02d' : '#f9a825',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    },
    typography: {
      fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontSize: '1.75rem', fontWeight: 600 },
      h4: { fontSize: '1.5rem', fontWeight: 600 },
      h5: { fontSize: '1.25rem', fontWeight: 600 },
      h6: { fontSize: '1rem', fontWeight: 600 },
      subtitle1: { fontSize: '1rem', fontWeight: 500 },
      subtitle2: { fontSize: '0.875rem', fontWeight: 500 },
      body1: { fontSize: '1rem', fontWeight: 400, letterSpacing: '0.01em' },
      body2: { fontSize: '0.875rem', fontWeight: 400 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    },
    shape: {
      borderRadius: 18, // Rounded M3 aesthetics
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 24, // Pill shapes
            padding: '10px 24px',
            fontSize: '0.95rem',
            boxShadow: 'none',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: 'none',
              transform: 'translateY(-1px)',
            },
            '&.MuiButton-containedPrimary:hover': {
              backgroundColor: isDark ? '#b8d4ff' : '#155fa0',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 24,
            backgroundImage: 'none',
            boxShadow: isDark
              ? '0 4px 20px 0 rgba(0,0,0,0.4)'
              : '0 4px 20px 0 rgba(11,87,208,0.05)',
            border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(11,87,208,0.04)',
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: isDark
                ? '0 8px 30px 0 rgba(0,0,0,0.6)'
                : '0 8px 30px 0 rgba(11,87,208,0.1)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 16,
              '& fieldset': {
                borderWidth: '1px',
              },
              '&:hover fieldset': {
                borderColor: isDark ? '#a8c7fa' : '#0b57d0',
              },
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          },
        },
      },
    },
  });
};
