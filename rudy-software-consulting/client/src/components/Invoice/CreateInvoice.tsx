import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Link } from 'react-router-dom';
import HttpClient from '../../services/Http/HttpClient';
import { useAuth } from '../Auth/AuthContext';

const CreateInvoice: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    amount: '',
    notes: '',
    contact: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const httpClient = new HttpClient();
  const auth = useAuth();

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, amount, contact, notes } = form;

    if (!name || !amount || !contact) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await httpClient.post<{
        success: boolean;
        message: string;
        invoiceId?: string;
      }>({
        url: '/api/invoice',
        token: auth.token || '',
        data: {
          name,
          amount: parseFloat(amount),
          notes,
          contact,
        },
      });

      if (res.success) {
        setSuccess(true);
        setForm({ name: '', amount: '', notes: '', contact: '' });
      } else {
        setError(`Failed to create invoice: ${res.message}`);
      }
    } catch (err: any) {
      setError('Failed to save invoice.');
      console.error('API error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Paper elevation={3} sx={{ maxWidth: 420, mx: 'auto', mt: 6, p: 4 }}>
        <Typography variant="h5" align="center" gutterBottom>
          New Invoice
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Name"
            value={form.name}
            onChange={handleChange('name')}
            required
            fullWidth
            margin="normal"
          />
          <TextField
            label="Amount"
            type="number"
            value={form.amount}
            onChange={handleChange('amount')}
            required
            fullWidth
            margin="normal"
            inputProps={{ min: 0, step: 0.01 }}
          />
          <TextField
            label="Notes"
            value={form.notes}
            onChange={handleChange('notes')}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            label="Contact Information"
            value={form.contact}
            onChange={handleChange('contact')}
            required
            fullWidth
            margin="normal"
          />
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              fullWidth
              size="large"
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Saving...' : 'Create Invoice'}
            </Button>
          </Box>
          {success && <Alert severity="success" sx={{ mt: 2 }}>Invoice saved!</Alert>}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>
      </Paper>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Link to="/admin">
          <Button variant="contained">Admin Dashboard</Button>
        </Link>
      </Box>
    </>
  );
};

export default CreateInvoice;