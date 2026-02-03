import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useAuth } from '../Auth/AuthContext';
import HttpClient from '../../services/Http/HttpClient';
import { Link } from 'react-router-dom';
import { Guid } from 'guid-ts';

interface IUser {
    partitionKey?: string;
    rowKey?: string;
    email: string;
    createdAt: string;
    approved: boolean;
    siteAdmin?: boolean;
    clientId: string;
    clientName?: string | null;
}

const UserManagement: React.FC = () => {
  const { isAuthenticated, isAdmin, token } = useAuth();
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);

  const httpClient = new HttpClient();

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchUsers();
    }
  }, [isAuthenticated, isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await httpClient.get<IUser[]>({
        url: '/api/users',
        token: token || '',
      });
      setUsers(data.map(user => ({
        ...user,
        clientId: user.clientId || Guid.empty.toString(),
        email: user.email || user.rowKey || 'unknown',
      })));
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch users';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalToggle = async (email: string, currentApproval: boolean) => {
    try {
      setActionLoading(email);
      setError(null);

      const endpoint = currentApproval ? '/api/unapproveUser' : '/api/approveUser';
      
      await httpClient.post<{ success: boolean }>({
        url: endpoint,
        token: token || '',
        data: { email },
      });

      // Refresh user list after action
      await fetchUsers();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update user';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminToggle = async (email: string, currentIsAdmin: boolean) => {
    try {
      setAdminActionLoading(email);
      setError(null);

      await httpClient.post<{ success: boolean; isAdmin: boolean }>({
        url: '/api/toggleAdmin',
        token: token || '',
        data: { email },
      });

      // Refresh user list after action
      await fetchUsers();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update admin status';
      setError(errorMessage);
    } finally {
      setAdminActionLoading(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You must be logged in to access this page.</Alert>
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Access denied. Admin privileges required.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Link to="/admin">
          <Button variant="outlined">Back to Dashboard</Button>
        </Link>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Client</strong></TableCell>
                <TableCell><strong>Created</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.clientName || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.approved ? 'Approved' : 'Pending'}
                        color={user.approved ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.siteAdmin ? (
                        <Chip label="Admin" color="primary" size="small" />
                      ) : (
                        <Chip label="User" variant="outlined" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          color={user.approved ? 'error' : 'success'}
                          onClick={() => handleApprovalToggle(user.email, user.approved)}
                          disabled={actionLoading === user.email || user.siteAdmin}
                        >
                          {actionLoading === user.email ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : user.approved ? (
                            'Revoke'
                          ) : (
                            'Approve'
                          )}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color={user.siteAdmin ? 'warning' : 'primary'}
                          onClick={() => handleAdminToggle(user.email, user.siteAdmin || false)}
                          disabled={adminActionLoading === user.email}
                        >
                          {adminActionLoading === user.email ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : user.siteAdmin ? (
                            'Remove Admin'
                          ) : (
                            'Make Admin'
                          )}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default UserManagement;
