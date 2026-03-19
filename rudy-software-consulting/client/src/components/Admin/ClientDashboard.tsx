import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../Auth/AuthContext';
import HttpClient from '../../services/Http/HttpClient';

interface IClient {
  id: string;
  name: string;
  contactEmail: string;
  address: string;
  phone: string;
}

interface IUser {
  email: string;
  createdAt: string;
  approved: boolean;
  siteAdmin?: boolean;
  clientId: string;
}

interface IInvoice {
  id: string;
  name: string;
  amount: number;
  status: string;
  contact: string;
  dueDate?: string;
  updatedDate?: string;
}

interface IDashboardMetrics {
  invoiceCount: number;
  activeInvoiceCount: number;
  paidInvoiceCount: number;
  cancelledInvoiceCount: number;
  outstandingInvoiceCount: number;
  userCount: number;
  approvedUserCount: number;
  pendingUserCount: number;
  totalBilled: number;
  totalOutstanding: number;
}

interface IDashboardUptime {
  apiProcessSeconds: number;
  apiStartedAt: string;
  warmerLastPing: string | null;
  warmerMinutesSinceLastPing: number | null;
  warmerStatus: 'healthy' | 'stale' | 'unavailable';
}

interface IClientDashboardResponse {
  client: IClient;
  users: IUser[];
  invoices: IInvoice[];
  metrics: IDashboardMetrics;
  uptime: IDashboardUptime;
}

const formatCurrency = (amountInCents: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format((amountInCents || 0) / 100);

const formatDuration = (seconds: number) => {
  const totalSeconds = Math.max(0, seconds || 0);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const getWarmerTone = (status: IDashboardUptime['warmerStatus']) => {
  if (status === 'healthy') {
    return 'success';
  }

  if (status === 'stale') {
    return 'warning';
  }

  return 'default';
};

const ClientDashboard: React.FC = () => {
  const { isAuthenticated, isAdmin, token } = useAuth();
  const httpClient = new HttpClient();

  const [clients, setClients] = useState<IClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [dashboard, setDashboard] = useState<IClientDashboardResponse | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      return;
    }

    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        setError(null);
        const data = await httpClient.get<IClient[]>({
          url: '/api/clients',
          token: token || '',
        });

        setClients(data);
        setSelectedClientId((currentValue) => currentValue || data[0]?.id || '');
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch clients';
        setError(errorMessage);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, [isAuthenticated, isAdmin, token]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin || !selectedClientId) {
      return;
    }

    const fetchDashboard = async () => {
      try {
        setLoadingDashboard(true);
        setError(null);
        const data = await httpClient.get<IClientDashboardResponse>({
          url: `/api/admin/dashboard/${selectedClientId}`,
          token: token || '',
        });
        setDashboard(data);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch dashboard data';
        setError(errorMessage);
      } finally {
        setLoadingDashboard(false);
      }
    };

    fetchDashboard();
  }, [isAuthenticated, isAdmin, selectedClientId, token]);

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You must be logged in to access this page.</Alert>
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Access denied. Admin privileges required.</Alert>
      </Box>
    );
  }

  const selectedClient = clients.find((client) => client.id === selectedClientId) || dashboard?.client || null;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" component="h1">
            Client Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review client uptime, users, invoice volume, and billing status from one place.
          </Typography>
        </Box>
        <Link to="/admin">
          <Button variant="outlined">Back to Admin</Button>
        </Link>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select Client
        </Typography>
        {loadingClients ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading clients...</Typography>
          </Box>
        ) : clients.length === 0 ? (
          <Alert severity="info">No clients found yet. Add a client first to populate the dashboard.</Alert>
        ) : (
          <Select
            fullWidth
            value={selectedClientId}
            onChange={(event) => setSelectedClientId(event.target.value)}
          >
            {clients.map((client) => (
              <MenuItem key={client.id} value={client.id}>
                {client.name}
              </MenuItem>
            ))}
          </Select>
        )}
      </Paper>

      {loadingDashboard ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : dashboard && selectedClient ? (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
              gap: 2,
              mb: 3,
            }}
          >
            <Paper sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">
                Total Billed
              </Typography>
              <Typography variant="h5">{formatCurrency(dashboard.metrics.totalBilled)}</Typography>
              <Typography variant="body2" color="text.secondary">
                Across {dashboard.metrics.invoiceCount} invoices
              </Typography>
            </Paper>
            <Paper sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">
                Outstanding
              </Typography>
              <Typography variant="h5">{formatCurrency(dashboard.metrics.totalOutstanding)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {dashboard.metrics.outstandingInvoiceCount} open invoices
              </Typography>
            </Paper>
            <Paper sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">
                Users
              </Typography>
              <Typography variant="h5">{dashboard.metrics.userCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                {dashboard.metrics.approvedUserCount} approved, {dashboard.metrics.pendingUserCount} pending
              </Typography>
            </Paper>
            <Paper sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">
                API Uptime
              </Typography>
              <Typography variant="h5">{formatDuration(dashboard.uptime.apiProcessSeconds)}</Typography>
              <Typography variant="body2" color="text.secondary">
                Started {new Date(dashboard.uptime.apiStartedAt).toLocaleString()}
              </Typography>
            </Paper>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.2fr 0.8fr' },
              gap: 3,
              mb: 3,
            }}
          >
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Client Information
              </Typography>
              <Typography variant="body1"><strong>Name:</strong> {selectedClient.name}</Typography>
              <Typography variant="body1"><strong>Contact:</strong> {selectedClient.contactEmail}</Typography>
              <Typography variant="body1"><strong>Phone:</strong> {selectedClient.phone || '-'}</Typography>
              <Typography variant="body1"><strong>Address:</strong> {selectedClient.address || '-'}</Typography>
              <Typography variant="body1"><strong>Client ID:</strong> {selectedClient.id}</Typography>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Warmth And Health
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="body1">Warmer Status</Typography>
                <Chip label={dashboard.uptime.warmerStatus} color={getWarmerTone(dashboard.uptime.warmerStatus)} size="small" />
              </Box>
              <Typography variant="body1">
                <strong>Last ping:</strong>{' '}
                {dashboard.uptime.warmerLastPing ? new Date(dashboard.uptime.warmerLastPing).toLocaleString() : 'Unavailable'}
              </Typography>
              <Typography variant="body1">
                <strong>Minutes since ping:</strong>{' '}
                {dashboard.uptime.warmerMinutesSinceLastPing ?? 'Unavailable'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                This section shows the current API process uptime and the latest shared warmer heartbeat from the backend.
              </Typography>
            </Paper>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', xl: '0.9fr 1.1fr' },
              gap: 3,
            }}
          >
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Client Users
              </Typography>
              {dashboard.users.length === 0 ? (
                <Alert severity="info">No users are assigned to this client.</Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Email</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Role</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.users.map((user) => (
                        <TableRow key={user.email}>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.approved ? 'Approved' : 'Pending'}</TableCell>
                          <TableCell>{user.siteAdmin ? 'Admin' : 'User'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Invoices
              </Typography>
              {dashboard.invoices.length === 0 ? (
                <Alert severity="info">No invoices found for this client.</Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Invoice</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Updated</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.invoices.slice().sort((left, right) => {
                        const leftTime = left.updatedDate ? new Date(left.updatedDate).getTime() : 0;
                        const rightTime = right.updatedDate ? new Date(right.updatedDate).getTime() : 0;
                        return rightTime - leftTime;
                      }).map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.name}</TableCell>
                          <TableCell>{invoice.status}</TableCell>
                          <TableCell>{invoice.contact}</TableCell>
                          <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                          <TableCell>{invoice.updatedDate ? new Date(invoice.updatedDate).toLocaleDateString() : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>
        </>
      ) : null}
    </Box>
  );
};

export default ClientDashboard;