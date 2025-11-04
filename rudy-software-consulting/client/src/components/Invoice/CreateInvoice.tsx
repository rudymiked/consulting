import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Paper } from '@mui/material';

async function saveInvoice(invoice: {
    name: string;
    amount: number;
    notes: string;
    contact: string;
}) {
    const res = await fetch(`https://${import.meta.env.VITE_API_URL}/api/invoice`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(invoice)
    });

    if (!res.ok) {
        // try to surface server error message
        let errText = 'Failed to save invoice';
        try {
            const body = await res.json();
            if (body && body.error) errText = body.error;
        } catch (_e) {
            try { errText = await res.text(); } catch (_) {}
        }
        throw new Error(errText);
    }

    // return parsed json (if any)
    try {
        return await res.json();
    } catch (_e) {
        return null;
    }
}

const CreateInvoice: React.FC = () => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [contact, setContact] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            await saveInvoice({
                name,
                amount: parseFloat(amount),
                notes,
                contact,
            });
            setSuccess(true);
            setName('');
            setAmount('');
            setNotes('');
            setContact('');
        } catch (err) {
            setError('Failed to save invoice.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ maxWidth: 420, mx: 'auto', mt: 6, p: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom align="center">
                New Invoice
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <TextField
                    label="Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    fullWidth
                    margin="normal"
                />
                <TextField
                    label="Amount"
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    fullWidth
                    margin="normal"
                    inputProps={{ min: 0, step: 0.01 }}
                />
                <TextField
                    label="Notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    fullWidth
                    margin="normal"
                    multiline
                    rows={3}
                />
                <TextField
                    label="Contact Information"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
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
                {success && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        Invoice saved!
                    </Alert>
                )}
                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </Box>
        </Paper>
    );
};

export default CreateInvoice;