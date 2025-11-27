import React, { useState } from 'react';
import { Paper, Typography, Box, CircularProgress, Alert, Divider, Button, TextField } from '@mui/material';
import { Link } from 'react-router-dom';
import PaymentForm from '../Payment/PaymentForm';
import { Elements } from '@stripe/react-stripe-js';
import { IInvoice, IInvoiceStatus } from '../../pages/InvoicesPage';
import { StripeElementsOptions } from '@stripe/stripe-js';
import { stripePromise } from '../../shared/stripe';
import { useAuth } from '../Auth/AuthContext';
import HttpClient from '../../services/Http/HttpClient';

export interface IInvoiceProps {
    invoiceId: string;
}

enum PaymentStatus {
    RequiresPaymentMethod = 'requires_payment_method',
    RequiresConfirmation = 'requires_confirmation',
    RequiresAction = 'requires_action',
    Processing = 'processing',
    RequiresCapture = 'requires_capture',
    Canceled = 'canceled',
    Succeeded = 'succeeded',
}

const Invoice: React.FC<IInvoiceProps> = (props: IInvoiceProps) => {
    const invoiceId = props.invoiceId;
    const [invoice, setInvoice] = useState<IInvoice | undefined>(undefined);
    const [editableAmount, setEditableAmount] = useState<number | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
    const [statusChecked, setStatusChecked] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);
    const [clientSecret, setClientSecret] = React.useState<string | undefined>(undefined);
    const [stripeOptions, setStripeOptions] = React.useState<StripeElementsOptions | undefined>(undefined);
    const { token } = useAuth();

    const httpClient = new HttpClient();

    React.useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await httpClient.get<{ status: PaymentStatus }>({
                    url: `/api/invoice/${invoiceId}/payment-status`,
                    token: token!,
                });

                const status: PaymentStatus = res.status;

                setPaymentStatus(status);

                switch (status) {
                    case PaymentStatus.RequiresPaymentMethod:
                        setMessage(null); // allow user to pay
                        break;
                    case PaymentStatus.RequiresConfirmation:
                        setMessage('Payment requires confirmation. Please try again.');
                        break;
                    case PaymentStatus.RequiresAction:
                        setMessage('Additional authentication required. Please complete the payment.');
                        break;
                    case PaymentStatus.Processing:
                        setMessage('Payment is processing.');
                        break;
                    case PaymentStatus.RequiresCapture:
                        setMessage('Payment authorized but not yet captured.');
                        break;
                    case PaymentStatus.Canceled:
                        setMessage('Payment was canceled.');
                        break;
                    case PaymentStatus.Succeeded:
                        setMessage('Invoice paid.');
                        break;
                    default:
                        setMessage(`Unknown payment status: ${status}`);
                }
            } catch (err) {
                setMessage('Error checking payment status.');
            } finally {
                setStatusChecked(true);
            }
        };

        checkStatus();
    }, [invoiceId]);

    const isAmountValid = editableAmount !== undefined &&
        editableAmount > 0 &&
        editableAmount <= invoice!.amount;

    React.useEffect(() => {
        if (!invoiceId) {
            setError('No invoice ID provided.');
            setLoading(false);
            return;
        }

        fetchInvoice(invoiceId)
            .then(data => {
                // convert cents → dollars
                const amountInDollars = data.amount / 100;
                setInvoice({ ...data, amount: amountInDollars });
                setEditableAmount(amountInDollars);
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load invoice.');
                setLoading(false);
            });
    }, [token]);

    const fetchClientSecret = async () => {
        if (!invoice || !invoice.id || !editableAmount) return;

        try {
            const res = await httpClient.post<{ clientSecret: string }>({
                url: '/api/invoice/create-payment-intent',
                token: token!,
                data: {
                    invoiceId: invoice.id,
                    amount: Math.round(editableAmount * 100), // dollars → cents
                },
            });

            setClientSecret(res.clientSecret);
            setStripeOptions({
                clientSecret: res.clientSecret,
                appearance: { theme: 'stripe' },
            });
        } catch (err) {
            setError('Failed to initialize payment.');
        }
    };


    const fetchInvoice = async (id: string): Promise<IInvoice> => {
        return await httpClient.get<IInvoice>({
            url: `/api/invoice/${id}`,
            token: token!,
        });
    };

    const refreshInvoice = async () => {
        try {
            const updated = await fetchInvoice(invoiceId);
            const amountInDollars = updated.amount / 100;
            setInvoice({ ...updated, amount: amountInDollars });
            setEditableAmount(amountInDollars);

            if (updated.status == IInvoiceStatus.PAID) {
                setPaymentStatus(PaymentStatus.Succeeded);
            } else {
                setPaymentStatus(null);
            }
            
            setMessage(updated.status == IInvoiceStatus.PAID? 'Invoice paid.' : null);
        } catch {
            setError('Failed to refresh invoice after payment.');
        }
    };

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
                    <Typography variant="subtitle2" color="text.secondary">Full Amount</Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>${invoice.amount.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Amount To Pay Today</Typography>
                    <TextField
                        type="text"
                        variant="outlined"
                        size="small"
                        value={editableAmount}
                        onChange={(e) => setEditableAmount(Number(e.target.value))}
                        error={!isAmountValid}
                        helperText={!isAmountValid ? `Amount must be between $0.01 and $${invoice.amount.toFixed(2)}` : ''}
                        sx={{ mt: 1 }}
                        disabled={paymentStatus === PaymentStatus.Succeeded}
                    />
                </Box>
                <Box>
                    <Typography variant="subtitle2" color="text.secondary">Contact</Typography>
                    <Typography variant="body1">{invoice.contact}</Typography>
                </Box>
                <Divider sx={{ my: 3 }} />

                {statusChecked && (
                    <>
                        {message && (
                            <Alert severity={message.includes('paid') ? 'success' : 'info'} sx={{ mb: 2 }}>
                                {message}
                            </Alert>
                        )}

                        {paymentStatus != PaymentStatus.Succeeded && (
                            <Button
                                variant="contained"
                                className="main-button"
                                onClick={fetchClientSecret}
                                disabled={!isAmountValid}
                                sx={{ mt: 2 }}
                            >
                                Confirm Amount & Proceed to Payment
                            </Button>
                        )}
                    </>
                )}
                <br />
                <br />
                {clientSecret && (
                    <>
                        {clientSecret && stripeOptions ? (
                            <Elements stripe={stripePromise} options={stripeOptions}>
                                <PaymentForm invoice={invoice} clientSecret={clientSecret} onPaymentSuccess={refreshInvoice} />
                            </Elements>
                        ) : (
                            <CircularProgress />
                        )}
                    </>
                )}
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