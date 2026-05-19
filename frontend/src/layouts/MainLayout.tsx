import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  useTheme,
  Button,
} from '@mui/material';
import {
  Home as HomeIcon,
  AccountBalanceWallet as WalletIcon,
  History as HistoryIcon,
  CardGiftcard as RewardsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
} from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const StyledMenu = Menu as any;

interface MainLayoutProps {
  children: React.ReactNode;
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, themeMode, toggleTheme }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };

  // Bottom Navigation Mapping
  const getNavValue = () => {
    const path = location.pathname;
    if (path === '/') return 0;
    if (path === '/wallet') return 1;
    if (path === '/history') return 2;
    if (path === '/rewards') return 3;
    if (path === '/settings') return 4;
    return 0;
  };

  const handleNavChange = (_event: any, newValue: number) => {
    const paths = ['/', '/wallet', '/history', '/rewards', '/settings'];
    navigate(paths[newValue]);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Top Header */}
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          backdropFilter: 'blur(10px)',
          backgroundColor: themeMode === 'light' ? 'rgba(248, 249, 253, 0.8)' : 'rgba(15, 17, 21, 0.8)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src="/securepay-logo.png"
              alt="SecurePay Logo"
              sx={{
                width: 34,
                height: 34,
                bgcolor: 'primary.main',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              SP
            </Avatar>
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(45deg, #0b57d0 30%, #a8c7fa 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: themeMode === 'light' ? 'initial' : 'transparent',
                color: themeMode === 'light' ? 'primary.main' : 'initial',
                letterSpacing: '-0.5px',
              }}
            >
              SecurePay
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {user?.role === 'ADMIN' && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AdminIcon />}
                onClick={() => navigate('/admin')}
                sx={{ borderRadius: 20, mr: 1, display: { xs: 'none', sm: 'inline-flex' } }}
              >
                Admin
              </Button>
            )}

            <IconButton onClick={toggleTheme} color="inherit">
              {themeMode === 'dark' ? <LightIcon /> : <DarkIcon />}
            </IconButton>

            <IconButton
              onClick={handleMenuClick}
              size="small"
              aria-controls={openMenu ? 'profile-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={openMenu ? 'true' : undefined}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'primary.light',
                  color: 'primary.dark',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Menu dropdown */}
      <StyledMenu
        anchorEl={anchorEl}
        id="profile-menu"
        open={openMenu}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            borderRadius: 3,
            minWidth: 180,
            mt: 1.5,
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {user?.role === 'ADMIN' && (
          <MenuItem onClick={() => navigate('/admin')}>
            <ListItemIcon>
              <AdminIcon fontSize="small" />
            </ListItemIcon>
            Admin Panel
          </MenuItem>
        )}
        <MenuItem onClick={() => navigate('/settings')}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Security Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error">Logout</Typography>
        </MenuItem>
      </StyledMenu>

      {/* Main Content Area with transitions */}
      <Box component="main" sx={{ flexGrow: 1, pb: { xs: 9, md: 3 }, px: { xs: 2, md: 4 }, pt: 3, maxWidth: 1200, mx: 'auto', width: '100%' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* GPay Bottom Navigation */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: themeMode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(26, 29, 36, 0.95)',
          backdropFilter: 'blur(10px)',
        }}
        elevation={0}
      >
        <BottomNavigation
          showLabels
          value={getNavValue()}
          onChange={handleNavChange}
          sx={{ height: 65, bgcolor: 'transparent' }}
        >
          <BottomNavigationAction label="Home" icon={<HomeIcon />} />
          <BottomNavigationAction label="Wallet" icon={<WalletIcon />} />
          <BottomNavigationAction label="History" icon={<HistoryIcon />} />
          <BottomNavigationAction label="Rewards" icon={<RewardsIcon />} />
          <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default MainLayout;
