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
import { jsPDF } from 'jspdf';

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
    const { isAuthenticated, token } = useAuth();

    const httpClient = new HttpClient();
    const isInvoicePaid = invoice?.status?.toUpperCase() === IInvoiceStatus.PAID.toUpperCase()
        || paymentStatus === PaymentStatus.Succeeded;

    const exportInvoicePdf = () => {
        if (!invoice) return;

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        doc.setProperties({ title: `Invoice ${invoice.id}`, author: 'Rudyard Technologies' });

        const pageW = 210;
        const margin = 14;
        const contentW = pageW - margin * 2;
        const halfX = pageW / 2;

        // ── Header bar ─────────────────────────────────────────────────
        doc.setFillColor(30, 64, 175);
        doc.rect(0, 0, pageW, 24, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('INVOICE', margin, 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Rudyard Technologies', pageW - margin, 11, { align: 'right' });
        doc.text('rudyardtechnologies.com', pageW - margin, 17, { align: 'right' });

        // ── Invoice meta (2-column grid) ────────────────────────────────
        let y = 36;

        const fmt = (d: any) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
        const createdDate = fmt(invoice.createdDate);
        const updatedDate = fmt(invoice.updatedDate);

        const metaLabel = (text: string, col: number, yPos: number) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(text.toUpperCase(), col, yPos);
        };
        const metaValue = (text: string, col: number, yPos: number) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(30, 30, 30);
            doc.text(text, col, yPos);
        };

        metaLabel('Invoice ID', margin, y);
        metaLabel('Issued', halfX, y);
        y += 5;
        metaValue(invoice.id, margin, y);
        metaValue(createdDate, halfX, y);
        y += 10;
        metaLabel('Status', margin, y);
        metaLabel('Last Updated', halfX, y);
        y += 5;
        metaValue(invoice.status, margin, y);
        metaValue(updatedDate, halfX, y);
        y += 14;

        // ── Divider ─────────────────────────────────────────────────────
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.4);
        doc.line(margin, y, pageW - margin, y);
        y += 10;

        // ── Bill To ─────────────────────────────────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('BILL TO', margin, y);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(20, 20, 20);
        doc.text(invoice.name, margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(invoice.contact, margin, y);
        y += 14;

        // ── Divider ─────────────────────────────────────────────────────
        doc.setDrawColor(220, 225, 235);
        doc.line(margin, y, pageW - margin, y);
        y += 10;

        // ── Notes ────────────────────────────────────────────────────────
        if (invoice.notes?.trim()) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text('NOTES', margin, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(40, 40, 40);
            const notesLines = doc.splitTextToSize(invoice.notes.trim(), contentW);
            doc.text(notesLines, margin, y);
            y += notesLines.length * 6 + 8;
        }

        // ── Divider ─────────────────────────────────────────────────────
        doc.setDrawColor(220, 225, 235);
        doc.line(margin, y, pageW - margin, y);
        y += 10;

        // ── Amount Due box ───────────────────────────────────────────────
        const boxW = 72;
        const boxH = 22;
        const boxX = pageW - margin - boxW;

        doc.setFillColor(239, 243, 255);
        doc.setDrawColor(180, 195, 230);
        doc.setLineWidth(0.5);
        doc.roundedRect(boxX, y, boxW, boxH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(80, 100, 160);
        doc.text('AMOUNT DUE', boxX + boxW / 2, y + 7, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(30, 64, 175);
        doc.text(`$${invoice.amount.toFixed(2)}`, boxX + boxW / 2, y + 17, { align: 'center' });

        // ── Footer ───────────────────────────────────────────────────────
        doc.setDrawColor(200, 205, 215);
        doc.setLineWidth(0.3);
        doc.line(margin, 280, pageW - margin, 280);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 160);
        doc.text('rudyardtechnologies.com', margin, 286);
        doc.text(`© ${new Date().getFullYear()} Rudyard Technologies`, pageW - margin, 286, { align: 'right' });

        // ── PAID watermark (drawn last, renders on top) ─────────────────
        if (isInvoicePaid) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(68);
            doc.setTextColor(185, 28, 28);
            doc.text('PAID', pageW / 2, 155, { angle: 30, align: 'center' });
        }

        doc.save(`${invoice.id}-${isInvoicePaid ? 'paid' : 'invoice'}.pdf`);
    };

    React.useEffect(() => {
        console.log("isAuth: " + isAuthenticated);
    }, [isAuthenticated]);

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

            console.log('Updated invoice after payment:', updated);

            if (updated.status.toUpperCase() === IInvoiceStatus.PAID.toUpperCase()) {
                setPaymentStatus(PaymentStatus.Succeeded);
            } else {
                setPaymentStatus(null);
            }

            setMessage(updated.status.toUpperCase() === IInvoiceStatus.PAID.toUpperCase() ? 'Invoice paid.' : null);
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
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Contact</Typography>
                    <Typography variant="body1">{invoice.contact}</Typography>
                </Box>
                {invoice.notes && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{invoice.notes}</Typography>
                    </Box>
                )}
                <Divider sx={{ my: 3 }} />

                <Button
                    variant="outlined"
                    onClick={exportInvoicePdf}
                    sx={{ mb: 2 }}
                >
                    Export PDF
                </Button>

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
            {isAuthenticated && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Link to="/admin">
                        <Button variant="contained" className="main-button">
                            Admin Dashboard
                        </Button>
                    </Link>
                </Box>
            )}
        </>
    );
};

export default Invoice;