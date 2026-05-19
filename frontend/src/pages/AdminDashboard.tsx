import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  AdminPanelSettings,
  Group,
  MonetizationOn,
  Security,
  Block,
  CheckCircle,
} from '@mui/icons-material';
import { api } from '../services/api';
import { logger } from '../utils/logger';
import { useSnackbar } from 'notistack';

interface Stats {
  transactions: {
    totalVolume: number;
    totalCount: number;
    successCount: number;
    failedCount: number;
  };
  users: {
    totalUsers: number;
    activeUsers: number;
    blockedUsers: number;
  };
  security: {
    highSeverityViolations: number;
  };
}

interface UserListItem {
  id: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  upi_id: string;
  balance: number;
  created_at: string;
}

interface SecurityLog {
  id: string;
  event_type: string;
  severity: string;
  details: any;
  ip_address: string;
  created_at: string;
  email: string;
}

const AdminDashboard: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/logs'),
      ]);

      setStats(statsRes.data.data);
      setUsers(usersRes.data.data.users);
      setLogs(logsRes.data.data.logs);
    } catch (error) {
      logger.error('Failed to retrieve admin data', error);
      enqueueSnackbar('Failed to load administrative details', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleBlock = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await api.post(`/admin/users/${userId}/block`, { status: nextStatus });
      enqueueSnackbar(`Successfully updated user to ${nextStatus}!`, { variant: 'success' });
      fetchData(); // reload
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Block update failed', { variant: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <AdminPanelSettings sx={{ fontSize: 36, color: 'primary.main' }} />
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-1px' }}>
          Administrative Center
        </Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Top Metrics Cards using robust CSS Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
            <Card sx={{ bgcolor: 'primary.light', color: 'primary.dark', borderRadius: 4 }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                    Total Volume
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                    ₹{stats?.transactions.totalVolume.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Count: {stats?.transactions.totalCount} transactions
                  </Typography>
                </Box>
                <MonetizationOn sx={{ fontSize: 48, opacity: 0.2 }} />
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: 'secondary.light', color: 'secondary.dark', borderRadius: 4 }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                    Registered Users
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                    {stats?.users.totalUsers}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Active: {stats?.users.activeUsers} | Blocked: {stats?.users.blockedUsers}
                  </Typography>
                </Box>
                <Group sx={{ fontSize: 48, opacity: 0.2 }} />
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: 'error.light', color: 'error.dark', borderRadius: 4 }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                    Security Alerts
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                    {stats?.security.highSeverityViolations}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    High/Critical incidents flagged
                  </Typography>
                </Box>
                <Security sx={{ fontSize: 48, opacity: 0.2 }} />
              </CardContent>
            </Card>
          </Box>

          {/* Table / Tab Layout Selection */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)}>
              <Tab label="User Management" sx={{ fontWeight: 600 }} />
              <Tab label="Audit & Security Logs" sx={{ fontWeight: 600 }} />
            </Tabs>
          </Box>

          {tabValue === 0 ? (
            <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden' }}>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Linked UPI ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Wallet Balance</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell>{item.upi_id || 'None'}</TableCell>
                      <TableCell>₹{item.balance.toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip label={item.role} size="small" color={item.role === 'ADMIN' ? 'primary' : 'default'} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.status}
                          size="small"
                          color={item.status === 'ACTIVE' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        {item.role !== 'ADMIN' && (
                          <Button
                            variant="outlined"
                            size="small"
                            color={item.status === 'ACTIVE' ? 'error' : 'success'}
                            startIcon={item.status === 'ACTIVE' ? <Block /> : <CheckCircle />}
                            onClick={() => handleToggleBlock(item.id, item.status)}
                            sx={{ borderRadius: 2 }}
                          >
                            {item.status === 'ACTIVE' ? 'Block' : 'Activate'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Card sx={{ borderRadius: 4 }}>
              <List disablePadding>
                {logs.map((log) => (
                  <ListItem key={log.id} sx={{ py: 2, px: 3, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {log.event_type}
                          </Typography>
                          <Chip
                            label={log.severity}
                            size="small"
                            color={
                              log.severity === 'CRITICAL' || log.severity === 'HIGH'
                                ? 'error'
                                : log.severity === 'MEDIUM'
                                ? 'warning'
                                : 'default'
                            }
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          IP: {log.ip_address} • Account: {log.email || 'System'} • Details:{' '}
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </Typography>
                      }
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(log.created_at).toLocaleString()}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default AdminDashboard;
