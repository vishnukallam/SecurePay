import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Container,
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff, AccountCircle } from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { getDeviceFingerprint } from '../utils/fingerprint';
import { motion } from 'framer-motion';

const StyledTextField = TextField as any;

const loginFormSchema = z.object({
  identifier: z.string().min(1, 'Email or Phone is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fingerprint = getDeviceFingerprint();
      const response = await login(data.identifier, data.password, fingerprint);

      if (response.data.isMfaRequired) {
        navigate('/mfa', { state: { userId: response.data.userId, mode: 'verify' } });
      } else if (response.data.isMfaSetupRequired) {
        navigate('/mfa', {
          state: {
            userId: response.data.userId,
            mode: 'setup',
            qrCodeUrl: response.data.qrCodeUrl,
            secret: response.data.secret,
          },
        });
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ width: '100%' }}
      >
        <Card sx={{ border: 'none', boxShadow: '0 8px 32px 0 rgba(11,87,208,0.08)', borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  boxShadow: '0 8px 16px rgba(11, 87, 208, 0.2)',
                }}
              >
                <AccountCircle sx={{ fontSize: 36, color: 'white' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Welcome back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your details to access your SecurePay account
              </Typography>
            </Box>

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <StyledTextField
                fullWidth
                label="Email or Phone Number"
                placeholder="e.g., alex@example.com"
                variant="outlined"
                margin="normal"
                error={!!errors.identifier}
                helperText={errors.identifier?.message}
                {...register('identifier')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <StyledTextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                margin="normal"
                error={!!errors.password}
                helperText={errors.password?.message}
                {...register('password')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', my: 1.5 }}>
                <Typography
                  component={RouterLink}
                  to="/forgot-password"
                  variant="body2"
                  color="primary"
                  sx={{ textDecoration: 'none', fontWeight: 600 }}
                >
                  Forgot Password?
                </Typography>
              </Box>

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ py: 1.5, mt: 2, borderRadius: 4, position: 'relative' }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
              </Button>
            </form>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Typography
                  component={RouterLink}
                  to="/signup"
                  color="primary"
                  sx={{ textDecoration: 'none', fontWeight: 600 }}
                >
                  Sign Up
                </Typography>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

export default Login;
