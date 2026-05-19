import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  InputAdornment,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Search,
  CallReceived,
  CallMade,
  AccountBalanceWallet,
  ReceiptLong,
} from '@mui/icons-material';
import { api } from '../services/api';
import { logger } from '../utils/logger';
import { motion } from 'framer-motion';

const StyledTextField = TextField as any;

interface Transaction {
  id: string;
  senderId: string;
  senderEmail: string;
  senderPhone: string;
  receiverId: string;
  receiverEmail: string;
  receiverPhone: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
  isDebit: boolean;
  metadata: any;
}

const History: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter variables
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/payment/history', {
        params: {
          type: typeFilter || undefined,
          status: statusFilter || undefined,
        },
      });
      setTransactions(response.data.data.transactions);
    } catch (error) {
      logger.error('Failed to retrieve history', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [typeFilter, statusFilter]);

  // Client side Search Filter
  const filteredTransactions = transactions.filter((txn) => {
    const term = searchTerm.toLowerCase();
    return (
      txn.senderEmail.toLowerCase().includes(term) ||
      (txn.receiverEmail && txn.receiverEmail.toLowerCase().includes(term)) ||
      txn.type.toLowerCase().includes(term) ||
      txn.status.toLowerCase().includes(term)
    );
  });

  const getTxnIcon = (txn: Transaction) => {
    if (txn.type === 'WALLET_ADD') {
      return <AccountBalanceWallet sx={{ color: 'white' }} />;
    }
    if (txn.type === 'BILL') {
      return <ReceiptLong sx={{ color: 'white' }} />;
    }
    return txn.isDebit ? <CallMade sx={{ color: 'white' }} /> : <CallReceived sx={{ color: 'white' }} />;
  };

  const getAvatarBg = (txn: Transaction) => {
    if (txn.status === 'FAILED') return 'error.main';
    if (txn.type === 'WALLET_ADD') return 'primary.main';
    if (txn.type === 'BILL') return 'secondary.main';
    return txn.isDebit ? 'warning.main' : 'success.main';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-1px', mb: 3 }}>
        Transaction History
      </Typography>

      {/* Filter and Search Bar Card */}
      <Card sx={{ mb: 4, borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2, alignItems: 'center' }}>
            <StyledTextField
              fullWidth
              placeholder="Search by contact email or details"
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <StyledTextField
              select
              fullWidth
              label="Type"
              value={typeFilter}
              onChange={(e: any) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="TRANSFER">Transfer</MenuItem>
              <MenuItem value="WALLET_ADD">Wallet Loads</MenuItem>
              <MenuItem value="BILL">Utility Bills</MenuItem>
            </StyledTextField>
            <StyledTextField
              select
              fullWidth
              label="Status"
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="SUCCESS">Success</MenuItem>
              <MenuItem value="FAILED">Failed</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
            </StyledTextField>
          </Box>
        </CardContent>
      </Card>

      {/* Transactions List */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredTransactions.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
          <Typography color="text.secondary">No transactions found matching the filters.</Typography>
        </Card>
      ) : (
        <Card sx={{ borderRadius: 4 }}>
          <List disablePadding>
            {filteredTransactions.map((txn, index) => (
              <motion.div
                key={txn.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                {index > 0 && <Divider />}
                <ListItem sx={{ py: 2, px: 3 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getAvatarBg(txn) }}>{getTxnIcon(txn)}</Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {txn.type === 'WALLET_ADD'
                          ? 'Added to Wallet'
                          : txn.type === 'BILL'
                          ? `${txn.metadata?.billCategory || 'Bill'} Payment`
                          : txn.isDebit
                          ? `To: ${txn.receiverEmail}`
                          : `From: ${txn.senderEmail}`}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(txn.createdAt)} •{' '}
                        {txn.type === 'BILL' && txn.metadata?.billerId
                          ? `Acc: ${txn.metadata.billerId}`
                          : txn.type === 'WALLET_ADD'
                          ? `Card **** ${txn.metadata?.last4Digits || '1111'}`
                          : txn.metadata?.memo || 'Instant P2P'}
                      </Typography>
                    }
                  />

                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        color:
                          txn.status === 'FAILED'
                            ? 'error.main'
                            : txn.type === 'WALLET_ADD'
                            ? 'success.main'
                            : txn.isDebit
                            ? 'text.primary'
                            : 'success.main'
                      }}
                    >
                      {txn.status === 'FAILED'
                        ? `₹${txn.amount}`
                        : txn.type === 'WALLET_ADD'
                        ? `+₹${txn.amount}`
                        : txn.isDebit
                        ? `-₹${txn.amount}`
                        : `+₹${txn.amount}`}
                    </Typography>
                    <Chip
                      label={txn.status}
                      size="small"
                      color={txn.status === 'SUCCESS' ? 'success' : txn.status === 'FAILED' ? 'error' : 'warning'}
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: 18 }}
                    />
                  </Box>
                </ListItem>
              </motion.div>
            ))}
          </List>
        </Card>
      )}
    </Box>
  );
};

export default History;
