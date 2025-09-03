import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box, CircularProgress, Alert, Divider, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export interface InvoiceProps {
    invoiceId: string;
}

// Mock API function (replace with your actual API call)
async function fetchInvoice(id: string) {
    // Example: return await fetch(`/api/invoices/${id}`).then(res => res.json());
    // Mock data for demonstration:
    return new Promise<{ name: string; amount: number; notes: string; contact: string }>((resolve) =>
        setTimeout(() => resolve({
            name: 'Sample Client',
            amount: 1234.56,
            notes: 'Sample invoice notes.',
            contact: 'client@email.com'
        }), 1000)
    );
}
const Invoice: React.FC<InvoiceProps> = (props: InvoiceProps) => {
    const invoiceId = props.invoiceId;
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<{ name: string; amount: number; notes: string; contact: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!invoiceId) {
            setError('No invoice ID provided.');
            setLoading(false);
            return;
        }
        fetchInvoice(invoiceId)
            .then(data => {
                setInvoice(data);
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load invoice.');
                setLoading(false);
            });
    }, [invoiceId]);

    if (loading) {
        return (
            <Box sx={{ maxWidth: 420, mx: 'auto', mt: 8, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>Loading...</Typography>
            </Box>
        );
    }
    if (error) {
        return (
            <Box sx={{ maxWidth: 420, mx: 'auto', mt: 8 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }
    if (!invoice) return null;

    return (
        <Paper elevation={3} sx={{ maxWidth: 420, mx: 'auto', mt: 8, p: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom align="center">
                Invoice Details
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>{invoice.name}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Amount</Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>${invoice.amount.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>{invoice.notes}</Typography>
            </Box>
            <Box>
                <Typography variant="subtitle2" color="text.secondary">Contact</Typography>
                <Typography variant="body1">{invoice.contact}</Typography>
            </Box>
            <Divider sx={{ my: 3 }} />
            <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 4 }}
                onClick={() => navigate(`/payment/${invoiceId}`)}
            >
                Pay Invoice
            </Button>
        </Paper>
    );
};

export default Invoice;