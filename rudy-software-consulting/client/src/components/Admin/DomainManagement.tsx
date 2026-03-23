import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../Auth/AuthContext';
import HttpClient from '../../services/Http/HttpClient';

interface IDomain {
  partitionKey: string;
  rowKey: string;
  clientId: string;
  domain: string;
  createdAt: string;
}

interface DomainManagementProps {
  clientId: string;
}

const DomainManagement: React.FC<DomainManagementProps> = ({ clientId }) => {
  const { token } = useAuth();
  const httpClient = new HttpClient();

  const [domains, setDomains] = useState<IDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    fetchDomains();
  }, [clientId]);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await httpClient.get<IDomain[]>({
        url: `/api/admin/client/${clientId}/domains`,
        token: token || '',
      });
      setDomains(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch domains';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      setError('Domain cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const added = await httpClient.post<IDomain>({
        url: `/api/admin/client/${clientId}/domains`,
        data: { domain: newDomain },
        token: token || '',
      });
      setDomains([...domains, added]);
      setNewDomain('');
      setOpenDialog(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to add domain';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDomain = async (rowKey: string) => {
    if (!window.confirm('Are you sure you want to remove this domain?')) {
      return;
    }

    try {
      setError(null);
      await httpClient.delete({
        url: `/api/admin/client/${clientId}/domains/${rowKey}`,
        token: token || '',
      });
      setDomains(domains.filter((d) => d.rowKey !== rowKey));
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to remove domain';
      setError(errorMessage);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Monitored Domains</span>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add Domain
        </Button>
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading domains...
        </Typography>
      ) : domains.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No domains configured. Add one to monitor email and website health.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Domain</TableCell>
                <TableCell>Added</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {domains.map((domain) => (
                <TableRow key={domain.rowKey}>
                  <TableCell>{domain.domain}</TableCell>
                  <TableCell>{new Date(domain.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteDomain(domain.rowKey)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Domain</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Domain"
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddDomain();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddDomain} variant="contained" disabled={submitting}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default DomainManagement;
