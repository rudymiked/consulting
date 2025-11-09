import React, { useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import PaymentForm from '../components/Payment/PaymentForm';
import { CheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { IInvoice } from './InvoicesPage';
import Invoice from '../components/Invoice/Invoice';

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_SECRET_KEY!);

const fetchClientSecret = () => {
  return fetch(`https://${import.meta.env.VITE_API_URL}/api/create-checkout-session`, {method: 'POST'})
    .then((response) => response.json())
    .then((json) => json.checkoutSessionClientSecret)
};

export interface IPaymentProps {
  invoice: IInvoice;
}

const Payment: React.FC<IPaymentProps> = (props: IPaymentProps) => {
  const [invoice, setInvoice] = useState<IInvoice | null>(props.invoice || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!props.invoice) {
      setError('No invoice provided for payment.');
    }
  }, [props.invoice]);

  return (
    <Box sx={{ py: 0, background: '#f7f9fb', maxWidth: '800px', margin: 'auto', padding: 4 }}>
      <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700, py: 4 }}>
        Payment Form
      </Typography>

      {loading && <CircularProgress />}
      {error && <Typography color="error">{error}</Typography>}

      {invoice?.id && (
        <>
            <Invoice invoiceId={invoice.id!} />
            {/* <CheckoutProvider stripe={stripePromise} options={{fetchClientSecret}}>
                <PaymentForm invoiceId={invoice.id!} amount={invoice.amount} />
            </CheckoutProvider> */}
        </>
      )}
    </Box>
  );
};

export default Payment;