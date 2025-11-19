import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import HttpClient from '../../services/Http/HttpClient';
import { useAuth } from '../Auth/AuthContext';
import { IInvoice } from '../../pages/InvoicesPage';

interface IPaymentFormProps {
  invoice: IInvoice;
  statusChecked: boolean;
}

const PaymentForm: React.FC<IPaymentFormProps> = (props: IPaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const auth = useAuth();
  const httpClient = new HttpClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setMessage(null);

    // Fetch client_secret from backend
    const res = await httpClient.post<{ ClientSecret: string; error?: string }>({
      url: '/api/invoice/pay',
      token: auth.token || '',
      data: { invoiceId: props.invoice.id, amount: props.invoice.amount }, // cents
    });

    const { ClientSecret, error } = res;

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
      {!props.statusChecked ? (
        <div>Checking payment status...</div>
      ) : message === null ? (
        <>
          <PaymentElement />
          <button disabled={!stripe || isProcessing}>
            {isProcessing ? 'Processing...' : 'Pay'}
          </button>
        </>
      ) : (
        <div style={{ marginTop: '1rem', color: message.includes('error') ? 'red' : 'green' }}>
          {message}
        </div>
      )}
    </form>
  );
};

export default PaymentForm;