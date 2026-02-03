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
    Button,
    Chip
} from '@mui/material';
import { Link } from 'react-router-dom';
import { IInvoice } from '../../pages/InvoicesPage';
import HttpClient from '../../services/Http/HttpClient';
import { useAuth } from '../Auth/AuthContext';

interface IClient {
    id: string;
    name: string;
}

const Invoices: React.FC = () => {
    const [invoices, setInvoices] = useState<IInvoice[]>([]);
    const [clients, setClients] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(true);
    const { token, isAdmin } = useAuth();
    const httpClient = new HttpClient();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch invoices
                const invoicesResponse = await httpClient.get<IInvoice[]>({
                    url: '/api/invoices',
                    token: token || '',
                });
                setInvoices(invoicesResponse);

                // For admins, fetch clients to display client names
                if (isAdmin) {
                    const clientsResponse = await httpClient.get<IClient[]>({
                        url: '/api/clients',
                        token: token || '',
                    });
                    const clientMap = new Map<string, string>();
                    clientsResponse.forEach(client => {
                        clientMap.set(client.id, client.name);
                    });
                    setClients(clientMap);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token, isAdmin]);

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
                                    {isAdmin && <TableCell>Client</TableCell>}
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
                                        {isAdmin && (
                                            <TableCell>
                                                {invoice.clientId ? clients.get(invoice.clientId) || invoice.clientId : 'N/A'}
                                            </TableCell>
                                        )}
                                        <TableCell>{invoice.contact}</TableCell>
                                        <TableCell>${(invoice.amount / 100).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={invoice.status} 
                                                color={
                                                    invoice.status === 'PAID' ? 'success' :
                                                    invoice.status === 'NEW' ? 'primary' :
                                                    invoice.status === 'PARTIALLY_PAID' ? 'warning' :
                                                    'default'
                                                }
                                                size="small"
                                            />
                                        </TableCell>
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