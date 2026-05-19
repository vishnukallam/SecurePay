import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  AccountBalanceWallet,
  AccountBalance,
  Add,
  CheckCircle,
} from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { useSnackbar } from 'notistack';
import { motion } from 'framer-motion';

const StyledDialog = Dialog as any;

const Wallet: React.FC = () => {
  const { wallet, addMoneyToWallet } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Add Money states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Link Bank states
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Linked banks list (Simulated)
  const [banks, setBanks] = useState<{ name: string; accNo: string }[]>([
    { name: 'State Bank of India', accNo: '•••• •••• 9821' },
    { name: 'HDFC Bank', accNo: '•••• •••• 4410' },
  ]);

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      enqueueSnackbar('Enter a valid amount', { variant: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      await addMoneyToWallet({
        amount: parseFloat(amount),
        cardHolder: cardHolder || 'Simulation User',
        cardNumber: cardNumber.replace(/\s/g, '') || '1111222233334444',
        expiryDate: expiry || '12/28',
        cvv: cvv || '123',
      });
      enqueueSnackbar(`Successfully loaded ₹${amount} into wallet!`, { variant: 'success' });
      setIsAddOpen(false);
      // Reset
      setAmount('');
      setCardHolder('');
      setCardNumber('');
      setExpiry('');
      setCvv('');
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to add money', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNo || !ifsc) {
      enqueueSnackbar('All fields are required to link bank account', { variant: 'error' });
      return;
    }

    setIsLinking(true);
    setTimeout(() => {
      setBanks((prev) => [
        ...prev,
        { name: bankName, accNo: `•••• •••• ${accountNo.slice(-4)}` },
      ]);
      setIsLinking(false);
      setIsLinkOpen(false);
      enqueueSnackbar(`${bankName} linked successfully!`, { variant: 'success' });
      // Reset
      setBankName('');
      setAccountNo('');
      setIfsc('');
    }, 1500);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-1px', mb: 4 }}>
        My Wallet
      </Typography>

      {/* Robust CSS Grid for responsiveness instead of unreliable Grid item sizes */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
        {/* Wallet Balance Card */}
        <Card
          sx={{
            background: 'linear-gradient(135deg, #1f1f1f 0%, #3e3e3e 100%)',
            color: 'white',
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                Active Balance
              </Typography>
              <AccountBalanceWallet sx={{ fontSize: 32, opacity: 0.8 }} />
            </Box>
            <Typography variant="h2" sx={{ fontWeight: 800, my: 2 }}>
              ₹{wallet?.balance.toFixed(2)}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
              Linked UPI: {wallet?.upiId}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              sx={{
                bgcolor: 'white',
                color: 'black',
                fontWeight: 700,
                px: 4,
                '&:hover': { bgcolor: '#f1f1f1' },
              }}
              onClick={() => setIsAddOpen(true)}
            >
              Add Funds
            </Button>
          </CardContent>
        </Card>

        {/* Linked Bank Accounts list */}
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Linked Bank Accounts
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={() => setIsLinkOpen(true)}
                sx={{ borderRadius: 3 }}
              >
                Link New
              </Button>
            </Box>

            <List disablePadding>
              {banks.map((bank, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {index > 0 && <Divider />}
                  <ListItem sx={{ py: 1.5, px: 0 }}>
                    <ListItemIcon>
                      <AccountBalance color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={bank.name} secondary={bank.accNo} />
                    <CheckCircle color="success" />
                  </ListItem>
                </motion.div>
              ))}
            </List>
          </CardContent>
        </Card>
      </Box>

      {/* Add Money Dialog */}
      <StyledDialog open={isAddOpen} onClose={() => setIsAddOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 2 } } as any}>
        <Typography variant="h6" sx={{ fontWeight: 700, p: 2, pb: 0 }}>Load Wallet Funds</Typography>
        <form onSubmit={handleAddMoney}>
          <Box sx={{ p: 2, pt: 1 }}>
            <Button fullWidth variant="outlined" sx={{ mb: 2, display: 'none' }} />
            <input type="text" style={{ display: 'none' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <input
                type="number"
                placeholder="Amount to Add (₹)"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
              />
              <input
                type="text"
                placeholder="Cardholder Name"
                required
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
              />
              <input
                type="text"
                placeholder="Card Number"
                required
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19))}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <input
                  type="text"
                  placeholder="Expiry (MM/YY)"
                  required
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value.slice(0, 5))}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
                />
                <input
                  type="password"
                  placeholder="CVV"
                  required
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.slice(0, 3))}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
                />
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, p: 2, pt: 0 }}>
            <Button onClick={() => setIsAddOpen(false)} color="secondary">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isLoading}>
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Load Balance'}
            </Button>
          </Box>
        </form>
      </StyledDialog>

      {/* Link Bank Account Dialog */}
      <StyledDialog open={isLinkOpen} onClose={() => setIsLinkOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 2 } } as any}>
        <Typography variant="h6" sx={{ fontWeight: 700, p: 2, pb: 0 }}>Link New Bank Account</Typography>
        <form onSubmit={handleLinkBank}>
          <Box sx={{ p: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <input
                type="text"
                placeholder="Bank Name (e.g., ICICI Bank)"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
              />
              <input
                type="text"
                placeholder="Account Number"
                required
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
              />
              <input
                type="text"
                placeholder="IFSC Code"
                required
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, p: 2, pt: 0 }}>
            <Button onClick={() => setIsLinkOpen(false)} color="secondary">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isLinking}>
              {isLinking ? <CircularProgress size={24} color="inherit" /> : 'Link Account'}
            </Button>
          </Box>
        </form>
      </StyledDialog>
    </Box>
  );
};

export default Wallet;
