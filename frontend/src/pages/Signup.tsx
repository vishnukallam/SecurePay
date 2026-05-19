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
  LinearProgress,
} from '@mui/material';
import { Email, Lock, Phone, Visibility, VisibilityOff, AppRegistration } from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { motion } from 'framer-motion';

const signupFormSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    phone: z
      .string()
      .min(10, 'Phone must be at least 10 digits')
      .max(15, 'Phone cannot exceed 15 digits')
      .regex(/^[0-9+]+$/, 'Phone must contain only numbers or +'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupFormSchema>;

const Signup: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
  });

  const passwordVal = watch('password', '');

  // Calculate password strength score 0-4
  React.useEffect(() => {
    let score = 0;
    if (!passwordVal) {
      setPasswordStrength(0);
      return;
    }
    if (passwordVal.length >= 8) score++;
    if (/[a-z]/.test(passwordVal) && /[A-Z]/.test(passwordVal)) score++;
    if (/[0-9]/.test(passwordVal)) score++;
    if (/[^a-zA-Z0-9]/.test(passwordVal)) score++;
    setPasswordStrength(score);
  }, [passwordVal]);

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'error';
    if (passwordStrength <= 3) return 'warning';
    return 'success';
  };

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await signup({
        email: data.email,
        phone: data.phone,
        password: data.password,
      });

      setSuccessMessage('Registration successful! Redirecting to login to secure account...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (error: any) {
      setErrorMessage(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
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
                <AppRegistration sx={{ fontSize: 36, color: 'white' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Create Account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Get started with your free SecurePay account
              </Typography>
            </Box>

            {successMessage && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 3 }}>
                {successMessage}
              </Alert>
            )}

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <TextField
                fullWidth
                label="Email Address"
                placeholder="alex@example.com"
                variant="outlined"
                margin="dense"
                error={!!errors.email}
                helperText={errors.email?.message}
                {...(register('email') as any)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                } as any}
              />

              <TextField
                fullWidth
                label="Phone Number"
                placeholder="e.g., 9876543210"
                variant="outlined"
                margin="dense"
                error={!!errors.phone}
                helperText={errors.phone?.message}
                {...(register('phone') as any)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone color="action" />
                    </InputAdornment>
                  ),
                } as any}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                margin="dense"
                error={!!errors.password}
                helperText={errors.password?.message}
                {...(register('password') as any)}
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
                } as any}
              />

              {passwordVal && (
                <Box sx={{ mt: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Password Strength
                    </Typography>
                    <Typography variant="caption" color={`${getStrengthColor()}.main`} sx={{ fontWeight: 600 }}>
                      {passwordStrength <= 1 ? 'Weak' : passwordStrength <= 3 ? 'Medium' : 'Strong'}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength * 25}
                    color={getStrengthColor()}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              )}

              <TextField
                fullWidth
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                margin="dense"
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                {...(register('confirmPassword') as any)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                } as any}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ py: 1.5, mt: 3, borderRadius: 4, position: 'relative' }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Register'}
              </Button>
            </form>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Typography
                  component={RouterLink}
                  to="/login"
                  color="primary"
                  sx={{ textDecoration: 'none', fontWeight: 600 }}
                >
                  Log In
                </Typography>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

export default Signup;
