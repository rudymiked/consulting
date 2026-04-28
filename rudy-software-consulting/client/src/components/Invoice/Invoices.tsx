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
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
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
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const { token, isAdmin } = useAuth();
    const httpClient = new HttpClient();

    const handleDelete = async (invoiceId: string) => {
        setDeleting(true);
        try {
            await httpClient.delete({
                url: `/api/invoice/${invoiceId}`,
                token: token || '',
            });
            setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        } catch (error) {
            console.error('Failed to delete invoice:', error);
        } finally {
            setDeleting(false);
            setConfirmDeleteId(null);
        }
    };

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
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    Invoices
                </Typography>
                <Link to="/admin">
                    <Button variant="outlined">Back to Dashboard</Button>
                </Link>
            </Box>

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
                                <TableCell>Actions</TableCell>
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
                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <Link to={`/invoice/${invoice.id}`}>
                                                View
                                            </Link>
                                            {isAdmin && (
                                                <Link to={`/invoice/${invoice.id}/edit`}>
                                                    Edit
                                                </Link>
                                            )}
                                            {isAdmin && (
                                                <Button
                                                    size="small"
                                                    color="error"
                                                    onClick={() => setConfirmDeleteId(invoice.id)}
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
                <DialogTitle>Delete Invoice</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete invoice <strong>{confirmDeleteId}</strong>? This cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
                        disabled={deleting}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Invoices;