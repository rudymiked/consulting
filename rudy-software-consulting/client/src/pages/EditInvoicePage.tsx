import React from 'react';
import { Alert } from '@mui/material';
import { useParams } from 'react-router-dom';
import CreateInvoice from '../components/Invoice/CreateInvoice';

const EditInvoicePage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();

  if (!invoiceId) {
    return <Alert severity="error">No invoice ID provided.</Alert>;
  }

  return <CreateInvoice invoiceId={invoiceId} />;
};

export default EditInvoicePage;
