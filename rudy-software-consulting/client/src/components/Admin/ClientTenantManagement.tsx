import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
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

interface IClientTenant {
  partitionKey: string;
  rowKey: string;
  clientId: string;
  clientName?: string;
  tenantId: string;
  tenantName?: string;
  graphClientId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientTenantManagementProps {
  clientId: string;
}

const ClientTenantManagement: React.FC<ClientTenantManagementProps> = ({ clientId }) => {
  const { token } = useAuth();
  const httpClient = new HttpClient();

  const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  const [tenants, setTenants] = useState<IClientTenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    tenantId: '',
    tenantName: '',
    graphClientId: '',
    active: true,
  });

  const tenantIdValid = guidRegex.test(form.tenantId.trim());
  const graphClientIdValid = guidRegex.test(form.graphClientId.trim());

  const canSubmit =
    form.tenantId.trim().length > 0 &&
    form.graphClientId.trim().length > 0 &&
    tenantIdValid &&
    graphClientIdValid;

  useEffect(() => {
    if (!clientId) return;
    fetchTenants();
  }, [clientId]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await httpClient.get<IClientTenant[]>({
        url: `/api/admin/client/${clientId}/tenants`,
        token: token || '',
      });
      setTenants(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch tenant mappings';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTenant = async () => {
    if (!form.tenantId.trim() || !form.graphClientId.trim()) {
      setError('Tenant ID and Graph Client ID are required.');
      return;
    }

    if (!tenantIdValid) {
      setError('Tenant ID must be a valid GUID.');
      return;
    }

    if (!graphClientIdValid) {
      setError('Graph Client ID must be a valid GUID.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const saved = await httpClient.post<IClientTenant>({
        url: `/api/admin/client/${clientId}/tenants`,
        token: token || '',
        data: {
          tenantId: form.tenantId.trim(),
          tenantName: form.tenantName.trim() || undefined,
          graphClientId: form.graphClientId.trim(),
          active: form.active,
        },
      });

      setTenants((current) => {
        const without = current.filter((item) => item.tenantId !== saved.tenantId);
        return [...without, saved].sort((a, b) => a.tenantId.localeCompare(b.tenantId));
      });

      setForm({
        tenantId: '',
        tenantName: '',
        graphClientId: '',
        active: true,
      });
      setOpenDialog(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save tenant mapping';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!window.confirm(`Remove tenant mapping ${tenantId}?`)) {
      return;
    }

    try {
      setError(null);
      await httpClient.delete({
        url: `/api/admin/client/${clientId}/tenants/${tenantId}`,
        token: token || '',
      });
      setTenants((current) => current.filter((item) => item.tenantId !== tenantId));
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to remove tenant mapping';
      setError(errorMessage);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>M365 Tenant Mappings</span>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add Tenant
        </Button>
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Map one or more Microsoft 365 tenants to this client. Federated credentials will be used for secure, secret-free authentication.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading tenant mappings...
        </Typography>
      ) : tenants.length === 0 ? (
        <Alert severity="info">No tenant mappings configured yet for this client.</Alert>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tenant</TableCell>
                <TableCell>Tenant Name</TableCell>
                <TableCell>Graph Client ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants
                .slice()
                .sort((a, b) => a.tenantId.localeCompare(b.tenantId))
                .map((tenant) => (
                  <TableRow key={`${tenant.clientId}-${tenant.tenantId}`}>
                    <TableCell>{tenant.tenantId}</TableCell>
                    <TableCell>{tenant.tenantName || '-'}</TableCell>
                    <TableCell>{tenant.graphClientId}</TableCell>
                    <TableCell>{tenant.active ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteTenant(tenant.tenantId)}
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
        <DialogTitle>Add M365 Tenant Mapping</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'grid', gap: 2 }}>
          <TextField
            fullWidth
            label="Tenant ID"
            placeholder="00000000-0000-0000-0000-000000000000"
            value={form.tenantId}
            onChange={(e) => setForm((prev) => ({ ...prev, tenantId: e.target.value }))}
            error={form.tenantId.trim().length > 0 && !tenantIdValid}
            helperText={
              form.tenantId.trim().length > 0 && !tenantIdValid
                ? 'Enter a valid tenant GUID.'
                : 'Microsoft Entra tenant GUID.'
            }
          />
          <TextField
            fullWidth
            label="Tenant Name (optional)"
            placeholder="Contoso Production"
            value={form.tenantName}
            onChange={(e) => setForm((prev) => ({ ...prev, tenantName: e.target.value }))}
          />
          <TextField
            fullWidth
            label="Graph Client ID"
            placeholder="11111111-1111-1111-1111-111111111111"
            value={form.graphClientId}
            onChange={(e) => setForm((prev) => ({ ...prev, graphClientId: e.target.value }))}
            error={form.graphClientId.trim().length > 0 && !graphClientIdValid}
            helperText={
              form.graphClientId.trim().length > 0 && !graphClientIdValid
                ? 'Enter a valid app registration client GUID.'
                : 'App registration Application (client) ID.'
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.active}
                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveTenant} variant="contained" disabled={submitting || !canSubmit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ClientTenantManagement;
