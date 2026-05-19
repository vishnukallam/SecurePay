import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Container,
} from '@mui/material';
import { Security, QrCode } from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { getDeviceFingerprint } from '../utils/fingerprint';
import { motion } from 'framer-motion';

const StyledTextField = TextField as any;

const MfaVerification: React.FC = () => {
  const { verifyMfa } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve state parameters passed from Login redirection
  const { userId, mode, qrCodeUrl, secret } = (location.state as any) || {};

  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Safeguard: redirect if direct page URL navigation occurred without states
  React.useEffect(() => {
    if (!userId || !mode) {
      navigate('/login');
    }
  }, [userId, mode, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrorMessage('Please enter a valid 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fingerprint = getDeviceFingerprint();
      await verifyMfa(userId, code, fingerprint);
      navigate('/');
    } catch (error: any) {
      setErrorMessage(error.message || 'MFA validation failed. Check your code.');
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
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  bgcolor: 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  boxShadow: '0 8px 16px rgba(20, 108, 54, 0.2)',
                }}
              >
                <Security sx={{ fontSize: 32, color: 'white' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {mode === 'setup' ? 'Secure Your Account' : 'Security Verification'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {mode === 'setup'
                  ? 'Set up Multi-Factor Authentication (MFA) to keep your funds safe'
                  : 'Enter the 6-digit code from your Authenticator app'}
              </Typography>
            </Box>

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                {errorMessage}
              </Alert>
            )}

            {mode === 'setup' && qrCodeUrl && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <QrCode fontSize="small" /> Scan this QR Code
                </Typography>
                <Box
                  component="img"
                  src={qrCodeUrl}
                  alt="MFA QR Code"
                  sx={{
                    width: 180,
                    height: 180,
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    mb: 1.5,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Or enter secret code manually:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: 1, mt: 0.5 }}>
                  {secret}
                </Typography>
              </Box>
            )}

            <form onSubmit={handleVerify}>
              <StyledTextField
                fullWidth
                label="Verification Code"
                placeholder="0 0 0 0 0 0"
                variant="outlined"
                margin="normal"
                value={code}
                onChange={(e: any) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputProps={{
                  maxLength: 6,
                  style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 'bold' },
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading || code.length !== 6}
                sx={{ py: 1.5, mt: 2, borderRadius: 4 }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Confirm Code'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

export default MfaVerification;
