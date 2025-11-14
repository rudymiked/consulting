import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box, CircularProgress, Alert, Divider, Button } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import PaymentForm from '../Payment/PaymentForm';
import { Elements } from '@stripe/react-stripe-js';
import { IInvoice } from '../../pages/InvoicesPage';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { isNullOrEmpty } from '../../shared/SharedFunctions';

export interface IInvoiceProps {
    invoiceId: string;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_SECRET_KEY!);

const Invoice: React.FC<IInvoiceProps> = (props: IInvoiceProps) => {
    const invoiceId = props.invoiceId;
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<IInvoice | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>(undefined);
    const [clientSecret, setClientSecret] = React.useState<string | undefined>(undefined);
    const [stripeOptions, setStripeOptions] = React.useState<StripeElementsOptions | undefined>(undefined);

    React.useEffect(() => {
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

    React.useEffect(() => {
        if (isNullOrEmpty(invoiceId) || isNullOrEmpty(invoice?.id) || isNullOrEmpty(invoice?.amount.toString()))
            return;

        const body: string = JSON.stringify({ invoiceId: invoice?.id, amount: invoice?.amount });

        const fetchClientSecret = async () => {
            const response = await fetch(`https://${import.meta.env.VITE_API_URL}/api/invoice/create-payment-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body,
            });

            const json = await response.json();

            setClientSecret(json.clientSecret); // updated key
            const options: StripeElementsOptions = {
                clientSecret: json.clientSecret,
                appearance: { theme: 'stripe' },
            };

            setStripeOptions(options);
        };


        fetchClientSecret();
    }, [invoice, invoiceId]);

    const fetchInvoice = async (id: string) => {
        return await fetch(`https://${import.meta.env.VITE_API_URL}/api/invoice/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('Invoice not found');
                return res.json();
            }).catch((error) => {
                throw error;
            });
    }

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

    if (!invoice) {
        return (
            <Box sx={{ maxWidth: 420, mx: 'auto', mt: 8 }}>
                <Alert severity="error">Invoice not found.</Alert>
            </Box>
        );
    }

    return (
        <>
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

                {/* PAYMENT FORM */}
                <Elements stripe={stripePromise} options={stripeOptions}>
                    {clientSecret ?
                        <PaymentForm />
                        :
                        <CircularProgress />
                    }
                </Elements>

                {/* END PAYMENT FORM */}

            </Paper>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Link to="/admin">
                    <Button variant="contained" className="main-button">
                        Admin Dashboard
                    </Button>
                </Link>
            </Box>
        </>
    );
};

export default Invoice;