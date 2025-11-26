import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import HttpClient from '../../services/Http/HttpClient';
import { useAuth } from '../Auth/AuthContext';
import { IInvoice } from '../../pages/InvoicesPage';

interface IPaymentFormProps {
  invoice: IInvoice;
  statusChecked: boolean;
}

interface IMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

const PaymentForm: React.FC<IPaymentFormProps> = ({ invoice, statusChecked }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<IMessage>({ type: 'info', text: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const auth = useAuth();
  const httpClient = new HttpClient();

  // Check PaymentIntent status when component mounts or clientSecret changes
  useEffect(() => {
    if (!stripe || !clientSecret) return;

    const checkStatus = async () => {
      const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
      if (!paymentIntent) return;

      switch (paymentIntent.status) {
        case 'succeeded':
          setMessage({ text: 'Payment succeeded!', type: 'success' });
          break;
        case 'processing':
          setMessage({ text: 'Payment is processing...', type: 'info' });
          break;
        case 'requires_payment_method':
          setMessage({ text: 'Payment failed, please try again.', type: 'error' });
          break;
        default:
          setMessage({ text: 'Something went wrong.', type: 'error' });
          break;
      }
    };

    checkStatus();
  }, [stripe, clientSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setMessage({ text: '', type: 'info' });

    // Fetch client_secret from backend
    const res = await httpClient.post<{ ClientSecret: string; error?: string }>({
      url: '/api/invoice/pay',
      token: auth.token || '',
      data: { invoiceId: invoice.id, amount: invoice.amount * 100 }, // amount in cents
    });

    const { ClientSecret, error } = res;

    if (error) {
      setMessage({ text: error, type: 'error' });
      setIsProcessing(false);
      return;
    }

    setClientSecret(ClientSecret);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      clientSecret: ClientSecret,
      confirmParams: {
        return_url: window.location.href, // still works if redirect is required
      },
    });

    if (stripeError) {
      setMessage({ text: stripeError.message || 'An unexpected error occurred.', type: 'error' });
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
        <div style={{ marginTop: '1rem', color: message.type == "error" ? 'red' : message.type == "success" ? 'green' : 'black' }}>
          {message.text}
        </div>
      )}
    </form>
  );
};

export default PaymentForm;