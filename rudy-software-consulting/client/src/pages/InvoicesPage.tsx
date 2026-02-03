import { Box, Container } from '@mui/material';
import React from 'react';
import Invoices from '../components/Invoice/Invoices';

export enum IInvoiceStatus {
    NEW = 'NEW',
    PARTIALLY_PAID = 'PARTIALLY_PAID',
    PAID = 'PAID',
    CANCELLED = 'CANCELLED',
}

export interface IInvoice {
    id: string; // Unique identifier for the invoice
    name: string; // Name of the client or entity being invoiced
    amount: number; // Amount in cents (e.g., $50.00 is stored
    notes: string; // Additional notes or description for the invoice
    contact: string; // Contact information for the client
    clientId?: string; // Client/Company ID
    createdDate: Date; // Timestamp of when the invoice was created
    updatedDate: Date; // Timestamp of when the invoice was last updated
    status: IInvoiceStatus; // Status of the invoice
    dueDate?: Date; // Optional due date for the invoice
}

const InvoicesPage: React.FC = () => {
  return (
        <Box sx={{ pt: 9, pb: 7, backgroundColor: '#f0f4f8' }}>
            <Container maxWidth="xl">
                <Invoices />
            </Container>
        </Box>
  );
};

export default InvoicesPage;