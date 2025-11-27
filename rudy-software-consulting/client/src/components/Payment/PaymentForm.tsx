import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { IInvoice } from '../../pages/InvoicesPage';
import { useAuth } from '../Auth/AuthContext';
import HttpClient from '../../services/Http/HttpClient';

export interface IPaymentFormProps {
  invoice: IInvoice;
  clientSecret: string;
  onPaymentSuccess?: () => void;
}

interface IMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

const PaymentForm: React.FC<IPaymentFormProps> = (props: IPaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<IMessage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoice, setInvoice] = useState<IInvoice>(props.invoice); // local invoice state

  const auth = useAuth();
  const httpClient = new HttpClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setMessage(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setMessage({ text: submitError.message!, type: 'error' });
      setIsProcessing(false);
      return;
    }

    const { paymentIntent, error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      clientSecret: props.clientSecret,
      redirect: 'if_required',
    });

    if (error) {
      setMessage({ text: error.message || 'An unexpected error occurred.', type: 'error' });
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      setMessage({ text: 'Payment succeeded!', type: 'success' });

      const finalizeResponse = await httpClient.post<{ success: boolean; message: string }>({
        url: `/api/invoice/finalize-payment`,
        data: { invoiceId: props.invoice.id, paymentIntentId: paymentIntent.id },
        token: auth.token || '',
      });

      if (!finalizeResponse.success) {
        setMessage({
          text: `Payment succeeded but failed to update invoice: ${finalizeResponse.message}`,
          type: 'error',
        });
      } else {
        props.onPaymentSuccess?.();
      }
    } else {
      setMessage({ text: `Payment status: ${paymentIntent?.status}`, type: 'info' });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {message && (
        <div
          style={{
            marginTop: '1rem',
            color:
              message.type === 'error'
                ? 'red'
                : message.type === 'success'
                  ? 'green'
                  : 'black',
          }}
        >
          {message.text}
        </div>
      )}

      {message?.type !== 'success' && (
        <>
          <PaymentElement />
          <button disabled={!stripe || isProcessing}>
            {isProcessing ? 'Processing...' : 'Pay'}
          </button>
        </>
      )}

      {/* Show updated invoice status */}
      {/* <div style={{ marginTop: '1rem' }}>
        <strong>Invoice Status:</strong> {invoice.status}
      </div> */}
    </form>
  );
};

export default PaymentForm;