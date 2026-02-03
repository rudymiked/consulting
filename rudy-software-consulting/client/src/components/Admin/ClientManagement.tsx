import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAuth } from '../Auth/AuthContext';
import HttpClient from '../../services/Http/HttpClient';
import { Link } from 'react-router-dom';
import { Guid } from 'guid-ts';

interface IClient {
  id: string;
  name: string;
  contactEmail: string;
  address: string;
  phone: string;
  partitionKey?: string;
  rowKey?: string;
}

interface IClientForm {
  clientId: string;
  clientName: string;
  contactEmail: string;
  address: string;
  phone: string;
}

const emptyForm: IClientForm = {
  clientId: '',
  clientName: '',
  contactEmail: '',
  address: '',
  phone: '',
};

const ClientManagement: React.FC = () => {
  const { isAuthenticated, isAdmin, token } = useAuth();
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<IClientForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  const httpClient = new HttpClient();

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchClients();
    }
  }, [isAuthenticated, isAdmin]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await httpClient.get<IClient[]>({
        url: '/api/clients',
        token: token || '',
      });
      setClients(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch clients';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      ...emptyForm,
      clientId: Guid.newGuid().toString(),
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData(emptyForm);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setFormLoading(true);
      setError(null);

      if (!formData.clientName || !formData.contactEmail) {
        setError('Client name and contact email are required');
        return;
      }

      await httpClient.post<IClient>({
        url: '/api/client',
        token: token || '',
        data: formData,
      });

      setSuccess('Client created successfully');
      handleCloseDialog();
      await fetchClients();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create client';
      setError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (client: IClient) => {
    if (!window.confirm(`Are you sure you want to delete client "${client.name}"?`)) {
      return;
    }

    try {
      setDeleteLoading(client.id);
      setError(null);

      await httpClient.get<void>({
        url: `/api/client/${client.id}/${encodeURIComponent(client.contactEmail)}`,
        token: token || '',
      });

      // Use DELETE method - need to use fetch directly since HttpClient doesn't have delete
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://rudyardapi-f3bydsa9avgneva5.canadacentral-01.azurewebsites.net'}/api/client/${client.id}/${encodeURIComponent(client.contactEmail)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete client');
      }

      setSuccess('Client deleted successfully');
      await fetchClients();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete client';
      setError(errorMessage);
    } finally {
      setDeleteLoading(null);
    }
  };

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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Client Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            className="main-button"
          >
            Add Client
          </Button>
          <Link to="/admin">
            <Button variant="outlined">Back to Dashboard</Button>
          </Link>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Contact Email</strong></TableCell>
                <TableCell><strong>Phone</strong></TableCell>
                <TableCell><strong>Address</strong></TableCell>
                <TableCell><strong>Client ID</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No clients found. Click "Add Client" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.contactEmail}</TableCell>
                    <TableCell>{client.phone || '-'}</TableCell>
                    <TableCell>{client.address || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {client.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(client)}
                        disabled={deleteLoading === client.id}
                        size="small"
                      >
                        {deleteLoading === client.id ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <DeleteIcon />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Client Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Client</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Client Name"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              required
              fullWidth
            />
            <TextField
              label="Contact Email"
              name="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={handleInputChange}
              required
              fullWidth
            />
            <TextField
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={2}
            />
            {/* <TextField
              label="Client ID"
              name="clientId"
              value={formData.clientId}
              onChange={handleInputChange}
              fullWidth
              disabled
              helperText="Auto-generated unique identifier"
            /> */}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={formLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            className="main-button"
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Create Client'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientManagement;
