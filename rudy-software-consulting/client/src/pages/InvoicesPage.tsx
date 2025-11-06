import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
  CircularProgress
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export interface Invoice {
    id: string; // Unique identifier for the invoice
    name: string; // Name of the client or entity being invoiced
    amount: number; // Amount in cents (e.g., $50.00 is stored
    notes: string; // Additional notes or description for the invoice
    contact: string; // Contact information for the client
    createdDate: Date; // Timestamp of when the invoice was created
    updatedDate: Date; // Timestamp of when the invoice was last updated
    status: 'new' | 'paid' | 'cancelled'; // Status of the invoice
    dueDate?: Date; // Optional due date for the invoice
}

const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetch('/api/invoices');
        const data = await response.json();
        setInvoices(data);
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  return (
    <Box sx={{ pt: 9, pb: 7, backgroundColor: '#f0f4f8' }}>
      <Container maxWidth="xl">
        <Typography variant="h4" gutterBottom>
          Invoices
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice ID</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Link</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.id}</TableCell>
                    <TableCell>{invoice.contact}</TableCell>
                    <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                    <TableCell>{invoice.status}</TableCell>
                    <TableCell>
                      <Link component={RouterLink} to={`/invoice/${invoice.id}`}>
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Box>
  );
};

export default InvoicesPage;