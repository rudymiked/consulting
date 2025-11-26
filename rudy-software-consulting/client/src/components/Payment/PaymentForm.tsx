import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { IInvoice } from '../../pages/InvoicesPage';
import { useAuth } from '../Auth/AuthContext';
import HttpClient from '../../services/Http/HttpClient';

interface IPaymentFormProps {
  invoice: IInvoice;
  clientSecret: string;
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

  const auth = useAuth();
  const httpClient = new HttpClient();

  // Check PaymentIntent status when mounted
  useEffect(() => {
    if (!stripe || !props.clientSecret) return;

    const checkStatus = async () => {
      const { paymentIntent } = await stripe.retrievePaymentIntent(props.clientSecret);
      if (!paymentIntent) return;

      switch (paymentIntent.status) {
        case 'succeeded':
          setMessage({ text: 'Payment succeeded!', type: 'success' });
          break;
        case 'processing':
          setMessage({ text: 'Payment is processing...', type: 'info' });
          break;
        case 'requires_payment_method':
          setMessage({ text: 'Payment required.', type: 'info' });
          break;
        default:
          setMessage({ text: 'Something went wrong.', type: 'error' });
          break;
      }
    };

    checkStatus();
  }, [stripe, props.clientSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setMessage(null);

    const { paymentIntent, error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
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

      // Only finalize invoice if payment actually succeeded
      const payInvoiceResponse = await httpClient.post<{ success: boolean; message: string }>({
        url: `/api/invoice/finalize-payment`, // <-- use a finalize endpoint
        data: {
          invoiceId: props.invoice.id,
          paymentIntentId: paymentIntent.id,
        },
        token: auth.token || '',
      });

      if (!payInvoiceResponse.success) {
        setMessage({
          text: `Payment succeeded but failed to update invoice: ${payInvoiceResponse.message}`,
          type: 'error',
        });
      }
    } else {
      // Handle other statuses gracefully
      setMessage({ text: `Payment status: ${paymentIntent?.status}`, type: 'info' });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Always show status message if present */}
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
      <br />
      {/* Show PaymentElement + button unless payment succeeded */}
      {message?.type !== 'success' && (
        <>
          <PaymentElement />
          <button disabled={!stripe || isProcessing}>
            {isProcessing ? 'Processing...' : 'Pay'}
          </button>
        </>
      )}
    </form>
  );
};

export default PaymentForm;