import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

interface Props {
  invoiceId: string;
}

const PaymentForm: React.FC<Props> = ({ invoiceId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/invoice/${invoiceId}/payment-status`);
        const json = await res.json();
        const status = json.status;

        switch (status) {
          case 'requires_payment_method':
            setMessage(null); // allow user to pay
            break;
          case 'requires_confirmation':
            setMessage('Payment requires confirmation. Please try again.');
            break;
          case 'requires_action':
            setMessage('Additional authentication required. Please complete the payment.');
            break;
          case 'processing':
            setMessage('Payment is processing.');
            break;
          case 'requires_capture':
            setMessage('Payment authorized but not yet captured.');
            break;
          case 'canceled':
            setMessage('Payment was canceled.');
            break;
          case 'succeeded':
            setMessage('Invoice already paid.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setMessage(null);

    // Fetch client_secret from backend
    const res = await fetch('/api/invoice/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, amount: 5000 }), // cents
    });
    const { ClientSecret, error } = await res.json();

    if (error) {
      setMessage(error);
      setIsProcessing(false);
      return;
    }

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      clientSecret: ClientSecret, // use client_secret here
      confirmParams: {
        return_url: window.location.href,
      },
    });

    if (stripeError) {
      setMessage(stripeError.message || 'An unexpected error occurred.');
    }

    setIsProcessing(false);
  };


  return (
    <form onSubmit={handleSubmit}>
      {!statusChecked ? (
        <div>Checking payment status...</div>
      ) : message === null ? (
        <>
          <PaymentElement />
          <button disabled={!stripe || isProcessing}>
            {isProcessing ? 'Processing...' : 'Pay'}
          </button>
        </>
      ) : (
        <div style={{ marginTop: '1rem', color: message.includes('✅') ? 'green' : 'red' }}>
          {message}
        </div>
      )}
    </form>
  );
};

export default PaymentForm;