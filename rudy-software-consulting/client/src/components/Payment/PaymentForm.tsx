import React from 'react';
import { CardElement, useStripe, useElements, PaymentElement, CheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

interface IPaymentFormProps {
  invoiceId: string;
  amount: number;
}

const PaymentForm: React.FC<IPaymentFormProps> = ({ invoiceId, amount }) => {
  const [message, setMessage] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setMessage(null);

    if (!stripe || !elements) {
      setMessage('Stripe.js has not loaded yet.');
      setIsProcessing(false);
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setMessage('CardElement not found.');
      setIsProcessing(false);
      return;
    }

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card,
    });

    if (error) {
      setMessage(error.message || 'Failed to create payment method.');
      setIsProcessing(false);
      return;
    }

    const res = await fetch(`https://${import.meta.env.VITE_API_URL}/api/invoice/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethodId: paymentMethod.id,
        invoiceId: invoiceId,
        amount,
      }),
    });

    const result = await res.json();

    if (result.requiresAction) {
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(result.clientSecret);

      if (confirmError) {
        setMessage(confirmError.message || 'Payment confirmation failed.');
      } else {
        setMessage('Payment confirmed successfully!');
      }
    } else if (result.success) {
      setMessage('Payment succeeded!');
    } else {
      setMessage('Payment failed. Please try again.');
    }

    setIsProcessing(false);
  };

  if (!stripe || !elements) {
    return <div>Loading payment form...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>Amount Due: <strong>${(amount / 100).toFixed(2)}</strong></p>

      <PaymentElement />

      <button type="submit" disabled={!stripe || isProcessing}>
        {isProcessing ? 'Processing...' : 'Pay'}
      </button>
      {message && (
        <div style={{ marginTop: '1rem', color: message.startsWith('✅') ? 'green' : 'red' }}>
          {message}
        </div>
      )}
    </form>
  );
};

export default PaymentForm;