import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

const PaymentForm: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // or your own success page
      },
    });

    if (error) {
      setMessage(error.message || 'An unexpected error occurred.');
    } else {
      setMessage('Payment succeeded!');
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        onReady={() => console.log('PaymentElement ready')}
        onChange={(event) => console.log('PaymentElement change', event)}
      />
      <button disabled={!stripe || isProcessing}>
        {isProcessing ? 'Processing...' : 'Pay'}
      </button>
      {message && <div style={{ marginTop: '1rem', color: 'red' }}>{message}</div>}
    </form>
  );
};

export default PaymentForm;