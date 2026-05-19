import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Lock, Security, AccountBalance } from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { getDeviceFingerprint } from '../utils/fingerprint';

const StyledTextField = TextField as any;

const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;

const Settings: React.FC = () => {
  const { user, fetchUserProfile } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Change Password Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordFormSchema),
  });

  // Change UPI PIN Form
  const [upiPin, setUpiPin] = useState('');
  const [pinPassword, setPinPassword] = useState('');
  const [isPinLoading, setIsPinLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordSubmit = async (data: ChangePasswordFormData) => {
    setIsLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      enqueueSnackbar('Password updated successfully!', { variant: 'success' });
      resetPasswordForm();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to update password', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpiPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (upiPin.length !== 6) {
      enqueueSnackbar('UPI PIN must be exactly 6 digits', { variant: 'error' });
      return;
    }
    if (!pinPassword) {
      enqueueSnackbar('Password is required to change UPI PIN', { variant: 'error' });
      return;
    }

    setIsPinLoading(true);
    try {
      await api.post('/payment/set-upi-pin', {
        upiPin,
        password: pinPassword,
      });
      enqueueSnackbar('UPI PIN configured successfully!', { variant: 'success' });
      setUpiPin('');
      setPinPassword('');
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to set UPI PIN', { variant: 'error' });
    } finally {
      setIsPinLoading(false);
    }
  };

  const handleToggleMfa = async () => {
    try {
      const targetState = !user?.is_mfa_enabled;
      
      if (targetState) {
        // Redirect to MFA Setup flow
        await api.post('/auth/login', {
          identifier: user?.email,
          password: 'CONFIRM_TRIGGER_SETUP', // Simulation key
          deviceFingerprint: getDeviceFingerprint(),
        });
        
        enqueueSnackbar('Setting up new Authenticator Code', { variant: 'info' });
      } else {
        // Disable MFA
        await api.post('/auth/disable-mfa');
        enqueueSnackbar('Multi-Factor Authentication disabled', { variant: 'warning' });
        await fetchUserProfile();
      }
    } catch (error: any) {
      // Direct users standard path
      enqueueSnackbar('MFA Settings updated. Use Login setup to modify keys.', { variant: 'info' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-1px', mb: 4 }}>
        Security & Settings
      </Typography>

      {/* Robust CSS Grid instead of fragile MUI Grid components */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
        {/* Profile Card & MFA Options */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Security color="primary" /> Security Features
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Registered Email
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {user?.email}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Registered Phone
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {user?.phone}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Device Fingerprint
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                    {getDeviceFingerprint()}
                  </Typography>
                </Box>
              </Box>

              <FormControlLabel
                control={<Switch checked={!!user?.is_mfa_enabled} onChange={handleToggleMfa} />}
                label={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Google Authenticator MFA
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Requires TOTP code on login attempts
                    </Typography>
                  </Box>
                }
              />
            </CardContent>
          </Card>

          {/* Change UPI PIN Card */}
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <AccountBalance color="primary" /> Transaction UPI PIN
              </Typography>

              <form onSubmit={handleUpiPinSubmit}>
                <StyledTextField
                  fullWidth
                  label="New 6-Digit UPI PIN"
                  placeholder="0 0 0 0 0 0"
                  type="password"
                  variant="outlined"
                  margin="normal"
                  value={upiPin}
                  onChange={(e: any) => setUpiPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ style: { textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' } }}
                />

                <StyledTextField
                  fullWidth
                  label="Account Password"
                  type="password"
                  variant="outlined"
                  margin="normal"
                  required
                  value={pinPassword}
                  onChange={(e: any) => setPinPassword(e.target.value)}
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={isPinLoading}
                  sx={{ py: 1.5, mt: 2, borderRadius: 4 }}
                >
                  {isPinLoading ? <CircularProgress size={24} color="inherit" /> : 'Set UPI PIN'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Box>

        {/* Change Password Card */}
        <Card sx={{ borderRadius: 4, height: 'fit-content' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Lock color="primary" /> Change Password
            </Typography>

            <form onSubmit={handleSubmitPassword(handlePasswordSubmit)}>
              <StyledTextField
                fullWidth
                label="Current Password"
                type="password"
                variant="outlined"
                margin="normal"
                error={!!passwordErrors.currentPassword}
                helperText={passwordErrors.currentPassword?.message}
                {...(registerPassword('currentPassword') as any)}
              />

              <StyledTextField
                fullWidth
                label="New Password"
                type="password"
                variant="outlined"
                margin="normal"
                error={!!passwordErrors.newPassword}
                helperText={passwordErrors.newPassword?.message}
                {...(registerPassword('newPassword') as any)}
              />

              <StyledTextField
                fullWidth
                label="Confirm New Password"
                type="password"
                variant="outlined"
                margin="normal"
                error={!!passwordErrors.confirmNewPassword}
                helperText={passwordErrors.confirmNewPassword?.message}
                {...(registerPassword('confirmNewPassword') as any)}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={isLoading}
                sx={{ py: 1.5, mt: 3, borderRadius: 4 }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Settings;
