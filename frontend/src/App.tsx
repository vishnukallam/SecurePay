import React, { useState } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { AuthProvider } from './store/AuthContext';
import { getTheme } from './theme';
import AppRoutes from './routes';
import MainLayout from './layouts/MainLayout';

const AppContent: React.FC = () => {
  const location = useLocation();
  
  // Manage Dark/Light Mode state
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return next;
    });
  };

  const theme = getTheme(themeMode);

  // Check if current route is a public auth page
  const isAuthPage = ['/login', '/signup', '/mfa'].includes(location.pathname);

  if (isAuthPage) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
          <AppRoutes />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainLayout themeMode={themeMode} toggleTheme={toggleTheme}>
        <AppRoutes />
      </MainLayout>
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SnackbarProvider>
    </BrowserRouter>
  );
};

export default App;
