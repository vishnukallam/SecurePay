import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  QrCodeScanner,
  Send,
  AccountBalanceWallet,
  ReceiptLong,
  PhoneAndroid,
  Tv,
  ElectricBolt,
  WaterDrop,
  LocalGasStation,
  DirectionsCar,
  EmojiEvents,
} from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { motion } from 'framer-motion';
import { useSnackbar } from 'notistack';

const StyledDialog = Dialog as any;

const Home: React.FC = () => {
  const { user, wallet, addMoneyToWallet } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [showBalance, setShowBalance] = useState(false);
  
  // Add Money Dialog State
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulated Contacts
  const contacts = [
    { name: 'Alex Johnson', email: 'alex@example.com', phone: '9876543210', avatarColor: '#1a73e8' },
    { name: 'Bob Smith', email: 'bob@example.com', phone: '8765432109', avatarColor: '#34a853' },
    { name: 'Charlie Davis', email: 'charlie@example.com', phone: '7654321098', avatarColor: '#ea4335' },
    { name: 'Danny Carter', email: 'danny@example.com', phone: '6543210987', avatarColor: '#f9ab00' },
  ];

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAmount || parseFloat(addAmount) <= 0) {
      enqueueSnackbar('Please enter a valid amount', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addMoneyToWallet({
        amount: parseFloat(addAmount),
        cardHolder: cardHolder || 'Simulation User',
        cardNumber: cardNumber.replace(/\s/g, '') || '1111222233334444',
        expiryDate: expiry || '12/28',
        cvv: cvv || '123',
      });
      enqueueSnackbar(`Successfully loaded ₹${addAmount} to wallet!`, { variant: 'success' });
      setIsAddMoneyOpen(false);
      // reset states
      setAddAmount('');
      setCardHolder('');
      setCardNumber('');
      setExpiry('');
      setCvv('');
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Payment Gateway simulation failed', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Welcome Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-1px' }}>
            Hey, {user?.email?.split('@')[0]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ready to make some secure payments?
          </Typography>
        </Box>

        {/* Floating Rewards Bubble */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 10 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/rewards')}
          style={{ cursor: 'pointer' }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 1.5,
              borderRadius: '50%',
              bgcolor: 'warning.light',
              color: 'warning.dark',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(249, 168, 37, 0.2)',
            }}
          >
            <EmojiEvents />
          </Paper>
        </motion.div>
      </Box>

      {/* GPay Balance Card */}
      <Card
        sx={{
          mb: 4,
          background: 'linear-gradient(135deg, #0b57d0 0%, #155fa0 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(11, 87, 208, 0.25)',
        }}
      >
        <CardContent sx={{ p: 4, position: 'relative', zIndex: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="subtitle2" sx={{ opacity: 0.8, fontWeight: 500 }}>
              Wallet Balance
            </Typography>
            <IconButton onClick={() => setShowBalance(!showBalance)} sx={{ color: 'white' }}>
              {showBalance ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </Box>
          <Typography variant="h2" sx={{ fontWeight: 800, my: 1 }}>
            {showBalance ? `₹${wallet?.balance.toFixed(2)}` : '••••••'}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
                Your UPI ID
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {wallet?.upiId}
              </Typography>
            </Box>
            <Button
              variant="contained"
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                fontWeight: 700,
                px: 3,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              }}
              onClick={() => setIsAddMoneyOpen(true)}
            >
              Add Money
            </Button>
          </Box>
        </CardContent>

        {/* Aesthetic Background Shapes */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            zIndex: 1,
          }}
        />
      </Card>

      {/* Quick Action Grid using robust Box CSS Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 4 }}>
        <motion.div whileHover={{ y: -4 }}>
          <Paper
            sx={{ p: 3, textAlign: 'center', cursor: 'pointer', borderRadius: 4 }}
            onClick={() => navigate('/transfer')}
          >
            <Send sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Send Money
            </Typography>
          </Paper>
        </motion.div>
        
        <motion.div whileHover={{ y: -4 }}>
          <Paper
            sx={{ p: 3, textAlign: 'center', cursor: 'pointer', borderRadius: 4 }}
            onClick={() => navigate('/transfer', { state: { scanMode: true } })}
          >
            <QrCodeScanner sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Scan QR Code
            </Typography>
          </Paper>
        </motion.div>

        <motion.div whileHover={{ y: -4 }}>
          <Paper
            sx={{ p: 3, textAlign: 'center', cursor: 'pointer', borderRadius: 4 }}
            onClick={() => navigate('/history')}
          >
            <ReceiptLong sx={{ fontSize: 32, color: 'secondary.main', mb: 1 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Transactions
            </Typography>
          </Paper>
        </motion.div>

        <motion.div whileHover={{ y: -4 }}>
          <Paper
            sx={{ p: 3, textAlign: 'center', cursor: 'pointer', borderRadius: 4 }}
            onClick={() => setShowBalance(!showBalance)}
          >
            <AccountBalanceWallet sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Check Balance
            </Typography>
          </Paper>
        </motion.div>
      </Box>

      {/* Quick Send Contacts */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        People
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, overflow: 'auto', pb: 2, mb: 4, scrollbarWidth: 'none' }}>
        {contacts.map((contact, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate('/transfer', { state: { recipient: contact.email } })}
            style={{ cursor: 'pointer', textAlign: 'center', minWidth: 80 }}
          >
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: contact.avatarColor,
                mx: 'auto',
                fontSize: '1.2rem',
                fontWeight: 600,
                boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
              }}
            >
              {contact.name.charAt(0)}
            </Avatar>
            <Typography variant="caption" sx={{ mt: 1, display: 'block', fontWeight: 600 }}>
              {contact.name.split(' ')[0]}
            </Typography>
          </motion.div>
        ))}
      </Box>

      {/* Bills & Utilities Grid using robust CSS Grid */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Bills & Utilities
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' }, gap: 2, mb: 4 }}>
        {[
          { label: 'Mobile Recharge', icon: <PhoneAndroid />, color: '#1a73e8', type: 'MOBILE' },
          { label: 'DTH Recharge', icon: <Tv />, color: '#34a853', type: 'DTH' },
          { label: 'Electricity', icon: <ElectricBolt />, color: '#f9ab00', type: 'ELECTRICITY' },
          { label: 'Water Bills', icon: <WaterDrop />, color: '#00bcd4', type: 'WATER' },
          { label: 'Gas Payment', icon: <LocalGasStation />, color: '#ea4335', type: 'GAS' },
          { label: 'FastTag Recharge', icon: <DirectionsCar />, color: '#673ab7', type: 'FASTTAG' },
        ].map((item, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate('/transfer', { state: { billMode: true, billType: item.type } })}
            style={{ cursor: 'pointer', textAlign: 'center' }}
          >
            <Paper
              elevation={0}
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1,
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'primary.light', color: 'primary.main' },
              }}
            >
              {React.cloneElement(item.icon, { sx: { fontSize: 28 } })}
            </Paper>
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 500, height: 32, overflow: 'hidden' }}>
              {item.label}
            </Typography>
          </motion.div>
        ))}
      </Box>

      {/* Add Money Dialog */}
      <StyledDialog open={isAddMoneyOpen} onClose={() => setIsAddMoneyOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 2 } } as any}>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Money to Wallet</DialogTitle>
        <form onSubmit={handleAddMoney}>
          <DialogContent>
            <TextField
              fullWidth
              label="Amount (₹)"
              type="number"
              variant="outlined"
              margin="dense"
              required
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Card Holder Name"
              variant="outlined"
              margin="dense"
              required
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Card Number"
              variant="outlined"
              margin="dense"
              required
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19))}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label="Expiry (MM/YY)"
                placeholder="MM/YY"
                variant="outlined"
                margin="dense"
                required
                value={expiry}
                onChange={(e) => setExpiry(e.target.value.slice(0, 5))}
              />
              <TextField
                fullWidth
                label="CVV"
                type="password"
                variant="outlined"
                margin="dense"
                required
                value={cvv}
                onChange={(e) => setCvv(e.target.value.slice(0, 3))}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setIsAddMoneyOpen(false)} color="secondary">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Confirm Add'}
            </Button>
          </DialogActions>
        </form>
      </StyledDialog>
    </Box>
  );
};

export default Home;
