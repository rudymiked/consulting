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
    CircularProgress,
    Button
} from '@mui/material';
import { Link } from 'react-router-dom';
import { IInvoice } from '../../pages/InvoicesPage';
import HttpClient from '../../services/Http/HttpClient';
import { useAuth } from '../Auth/AuthContext';

const Invoices: React.FC = () => {
    const [invoices, setInvoices] = useState<IInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    const httpClient = new HttpClient();

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const response = await httpClient.get<IInvoice[]>({
                    url: '/api/invoices',
                    token: token || '',
                });
                
                setInvoices(response);
            } catch (error) {
                console.error('Failed to fetch invoices:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, [token]);

    return (
        <Box sx={{ pt: 9, pb: 7, backgroundColor: '#f0f4f8' }}>
            <Container maxWidth="xl">
                <Link to="/admin">
                    <Button variant="contained" className="main-button">
                        Admin Dashboard
                    </Button>
                </Link>
                <br />
                <br />
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
                                        <TableCell>{invoice.status.toString()}</TableCell>
                                        <TableCell>
                                            <Link to={`/invoice/${invoice.id}`}>
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

export default Invoices;