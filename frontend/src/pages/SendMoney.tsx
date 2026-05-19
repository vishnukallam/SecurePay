import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Alert,
} from '@mui/material';
import { Send, ArrowBack, ReceiptLong, QrCodeScanner, CameraAlt } from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { useSnackbar } from 'notistack';
import { motion } from 'framer-motion';

const StyledTextField = TextField as any;
const StyledDialog = Dialog as any;

const SendMoney: React.FC = () => {
  const { triggerTransfer, fetchUserProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Retrieve routing states
  const stateData = location.state as any;
  const isBillMode = stateData?.billMode || false;
  const isScanModeInitial = stateData?.scanMode || false;
  const initialRecipient = stateData?.recipient || '';
  const initialBillType = stateData?.billType || '';

  // Mode status
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState('');
  const [billerId, setBillerId] = useState('');
  
  // Security checks
  const [isUpiPinOpen, setIsUpiPinOpen] = useState(false);
  const [upiPin, setUpiPin] = useState('');
  
  // High-value OTP confirmation
  const [isOtpRequired, setIsOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Scanning simulation
  const [isScanning, setIsScanning] = useState(isScanModeInitial);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialRecipient) {
      setRecipient(initialRecipient);
    }
  }, [initialRecipient]);

  // Handle Scanning Mock
  const handleSimulateScan = (scannedValue: string) => {
    setIsScanning(false);
    enqueueSnackbar(`QR Code Scanned Successfully!`, { variant: 'success' });
    
    // Parse simulated UPI URL: upi://pay?pa=name@securepay&pn=Name
    if (scannedValue.startsWith('upi://')) {
      const urlParams = new URLSearchParams(scannedValue.split('?')[1]);
      const pa = urlParams.get('pa') || '';
      setRecipient(pa);
    } else {
      setRecipient(scannedValue);
    }
  };

  const handleOpenUpiPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBillMode && !billerId) {
      enqueueSnackbar('Biller Account ID is required', { variant: 'error' });
      return;
    }
    if (!isBillMode && !recipient) {
      enqueueSnackbar('Recipient Email, Phone or UPI ID is required', { variant: 'error' });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      enqueueSnackbar('Please enter a valid amount', { variant: 'error' });
      return;
    }
    
    setIsUpiPinOpen(true);
  };

  const handleTransactionSubmit = async () => {
    if (upiPin.length !== 6) {
      enqueueSnackbar('UPI PIN must be exactly 6 digits', { variant: 'error' });
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (isBillMode) {
        // Submit Utility bill payment request
        const { api } = await import('../services/api');
        await api.post('/payment/pay-bill', {
          type: initialBillType,
          billerId,
          amount: parseFloat(amount),
          upiPin,
        });

        enqueueSnackbar(`Paid ₹${amount} successfully to biller ${billerId}!`, { variant: 'success' });
        await fetchUserProfile();
        setIsUpiPinOpen(false);
        setUpiPin('');
        navigate('/');
      } else {
        // Submit P2P Transfer request
        const payload: any = {
          recipient,
          amount: parseFloat(amount),
          upiPin,
        };

        if (otpCode) {
          payload.otpCode = otpCode;
        }

        const response = await triggerTransfer(payload);

        if (response.status === 'otp_required') {
          setIsOtpRequired(true);
          enqueueSnackbar('Simulated high-value check: Transaction OTP required (123456)', { variant: 'info' });
          setIsUpiPinOpen(false);
        } else {
          enqueueSnackbar(`Transferred ₹${amount} successfully!`, { variant: 'success' });
          if (response.data?.cashbackWon > 0) {
            enqueueSnackbar(`Congratulations! You won ₹${response.data.cashbackWon} Cashback!`, {
              variant: 'success',
              autoHideDuration: 6000,
            });
          }
          setIsUpiPinOpen(false);
          setUpiPin('');
          setOtpCode('');
          setIsOtpRequired(false);
          navigate('/');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Transaction processing failed');
      setUpiPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto' }}>
      {/* Top Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'action.hover' }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {isBillMode ? 'Pay Utility Bill' : isScanning ? 'Scan QR Code' : 'Send Money'}
        </Typography>
      </Box>

      {/* QR Scanning Simulator Mode */}
      {isScanning ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card sx={{ p: 4, textAlign: 'center', borderRadius: 4, border: '2px dashed #0b57d0' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Align QR Code Within Frame
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Camera simulation matches active devices
            </Typography>
            
            <Box
              sx={{
                width: '100%',
                height: 240,
                bgcolor: 'black',
                borderRadius: 3,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 4,
                overflow: 'hidden',
              }}
            >
              {/* Overlay animated scanning lines */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: 4,
                  bgcolor: 'success.main',
                  boxShadow: '0 0 10px #6dd58c',
                  animation: 'scanLine 2s linear infinite',
                  '@keyframes scanLine': {
                    '0%': { top: 0 },
                    '50%': { top: '100%' },
                    '100%': { top: 0 },
                  },
                }}
              />
              <CameraAlt sx={{ color: 'white', fontSize: 60, opacity: 0.3 }} />
            </Box>

            <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
              Choose Simulated Scanner Demos:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handleSimulateScan('upi://pay?pa=alex@securepay&pn=Alex%20Johnson')}
              >
                Scan Alex's QR
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handleSimulateScan('upi://pay?pa=bob@securepay&pn=Bob%20Smith')}
              >
                Scan Bob's QR
              </Button>
            </Box>
          </Card>
        </motion.div>
      ) : (
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                {errorMessage}
              </Alert>
            )}

            {isOtpRequired && (
              <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
                High-value security authentication OTP sent to email. Enter code to confirm.
              </Alert>
            )}

            <form onSubmit={handleOpenUpiPin}>
              {isBillMode ? (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 2 }}>
                    Biller Category: {initialBillType}
                  </Typography>
                  <StyledTextField
                    fullWidth
                    label="Consumer Number / Biller ID"
                    placeholder="e.g., 2003882711"
                    variant="outlined"
                    margin="normal"
                    required
                    value={billerId}
                    onChange={(e: any) => setBillerId(e.target.value)}
                  />
                </>
              ) : (
                <Box sx={{ mb: 2 }}>
                  <StyledTextField
                    fullWidth
                    label="To: Email, Phone, or UPI ID"
                    placeholder="recipient@securepay or phone number"
                    variant="outlined"
                    margin="normal"
                    required
                    disabled={!!initialRecipient}
                    value={recipient}
                    onChange={(e: any) => setRecipient(e.target.value)}
                    InputProps={{
                      endAdornment: !initialRecipient && (
                        <IconButton onClick={() => setIsScanning(true)} color="primary">
                          <QrCodeScanner />
                        </IconButton>
                      ),
                    }}
                  />
                </Box>
              )}

              <StyledTextField
                fullWidth
                label="Amount (₹)"
                placeholder="0.00"
                type="number"
                variant="outlined"
                margin="normal"
                required
                value={amount}
                onChange={(e: any) => setAmount(e.target.value)}
              />

              {isOtpRequired && (
                <StyledTextField
                  fullWidth
                  label="Enter 6-Digit Transaction OTP"
                  placeholder="123456"
                  variant="outlined"
                  margin="normal"
                  required
                  value={otpCode}
                  onChange={(e: any) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ style: { textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' } }}
                />
              )}

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                startIcon={isBillMode ? <ReceiptLong /> : <Send />}
                sx={{ py: 1.5, mt: 3, borderRadius: 4 }}
              >
                {isOtpRequired ? 'Submit OTP Verification' : isBillMode ? 'Pay Bill' : 'Proceed to Pay'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* UPI PIN Modal (M3 bottom sheet mock) */}
      <StyledDialog open={isUpiPinOpen} onClose={() => setIsUpiPinOpen(false)} PaperProps={{ sx: { borderRadius: 4, width: '100%', maxWidth: 360, p: 2 } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 800 }}>Enter 6-Digit UPI PIN</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            Transaction: ₹{amount} to {isBillMode ? billerId : recipient}
          </Typography>
          <StyledTextField
            fullWidth
            type="password"
            placeholder="• • • • • •"
            variant="outlined"
            value={upiPin}
            onChange={(e: any) => setUpiPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputProps={{
              maxLength: 6,
              style: { textAlign: 'center', fontSize: '2rem', letterSpacing: '0.8rem' },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={() => setIsUpiPinOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleTransactionSubmit} variant="contained" disabled={isLoading || upiPin.length !== 6}>
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Confirm Payment'}
          </Button>
        </DialogActions>
      </StyledDialog>
    </Box>
  );
};

export default SendMoney;
