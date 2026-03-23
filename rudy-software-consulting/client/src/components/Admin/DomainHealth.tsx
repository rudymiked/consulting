import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../Auth/AuthContext';
import HttpClient from '../../services/Http/HttpClient';

interface IDomainHealthCheck {
  clientId: string;
  domain: string;
  emailStatus: 'healthy' | 'down' | 'unknown';
  websiteStatus: 'healthy' | 'down' | 'unknown';
  emailError?: string;
  websiteError?: string;
  lastCheckTime: string;
  rowKey?: string;
}

interface DomainHealthItem {
  domain: string;
  rowKey: string;
  health: IDomainHealthCheck | null;
}

interface DomainHealthProps {
  clientId: string;
}

const getHealthColor = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'down':
      return 'error';
    default:
      return 'default';
  }
};

const DomainHealth: React.FC<DomainHealthProps> = ({ clientId }) => {
  const { token } = useAuth();
  const httpClient = new HttpClient();

  const [health, setHealth] = useState<DomainHealthItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    fetchDomainHealth();
  }, [clientId]);

  const fetchDomainHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await httpClient.get<DomainHealthItem[]>({
        url: `/api/admin/domain-health/${clientId}`,
        token: token || '',
      });
      setHealth(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch domain health';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckDomain = async (domain: string) => {
    try {
      setChecking(domain);
      setError(null);
      const result = await httpClient.post<IDomainHealthCheck>({
        url: `/api/admin/domain-health/${clientId}/check/${encodeURIComponent(domain)}`,
        data: {},
        token: token || '',
      });
      setHealth((prev) =>
        prev.map((item) =>
          item.domain === domain ? { ...item, health: result } : item
        )
      );
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to check domain';
      setError(errorMessage);
    } finally {
      setChecking(null);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Domain Health Status</span>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={fetchDomainHealth}
          disabled={loading}
        >
          Refresh
        </Button>
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      ) : health.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No domains to monitor. Add domains from the "Monitored Domains" section.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Domain</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Website</TableCell>
                <TableCell>Last Check</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {health.map((item) => (
                <TableRow key={item.domain}>
                  <TableCell>{item.domain}</TableCell>
                  <TableCell>
                    {item.health ? (
                      <Chip
                        label={item.health.emailStatus}
                        color={getHealthColor(item.health.emailStatus)}
                        size="small"
                        title={item.health.emailError}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Not checked
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.health ? (
                      <Chip
                        label={item.health.websiteStatus}
                        color={getHealthColor(item.health.websiteStatus)}
                        size="small"
                        title={item.health.websiteError}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Not checked
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.health ? (
                      <Typography variant="caption">
                        {new Date(item.health.lastCheckTime).toLocaleString()}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      onClick={() => handleCheckDomain(item.domain)}
                      disabled={checking === item.domain}
                    >
                      {checking === item.domain ? <CircularProgress size={20} /> : 'Check'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default DomainHealth;
