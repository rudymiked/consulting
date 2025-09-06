import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import PaymentForm from '../components/Payment/PaymentForm';
import { useParams } from 'react-router-dom';
import Invoice from '../components/Invoice/Invoice';
import { CheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

const fetchClientSecret = () => {
  return fetch(`https://${import.meta.env.VITE_API_URL}/create-checkout-session`, {method: 'POST'})
    .then((response) => response.json())
    .then((json) => json.checkoutSessionClientSecret)
};

export interface IPaymentPageProps {
  paymentId: string; // GUID representing the payment
}

interface PaymentDetails {
  name: string;
  amount: number; // in cents
  invoiceNumber: string;
  status: 'new' | 'paid' | 'cancelled'; // Status of the payment;
}

const PaymentPage: React.FC = () => {
  const { invoiceId: invoiceId } = useParams<{ invoiceId: string }>();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setError('Missing payment ID.');
      setLoading(false);
      return;
    }

    fetch(`https://${import.meta.env.VITE_API_URL}/api/payment/${invoiceId}`)
      .then(res => {
        if (!res.ok) throw new Error('Payment not found');
        return res.json();
      })
      .then(data => {
        setPaymentDetails(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [invoiceId]);

  return (
    <Box sx={{ py: 0, background: '#f7f9fb', maxWidth: '800px', margin: 'auto', padding: 4 }}>
      <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700, py: 4 }}>
        Payment Form
      </Typography>

      {loading && <CircularProgress />}
      {error && <Typography color="error">{error}</Typography>}

      {paymentDetails && (
        <>
            <Invoice invoiceId={invoiceId!} />
            <CheckoutProvider stripe={stripePromise} options={{fetchClientSecret}}>
                <PaymentForm invoiceId={invoiceId!} amount={paymentDetails.amount} />
            </CheckoutProvider>
        </>
      )}
    </Box>
  );
};

export default PaymentPage;