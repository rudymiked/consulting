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

interface IUser {
  email: string;
  createdAt: string;
  approved: boolean;
  siteAdmin?: boolean;
  clientId: string;
}

const UserManagement: React.FC = () => {
  const { isAuthenticated, isAdmin, token } = useAuth();
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      setUsers(data);
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
                <TableCell><strong>Created</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell>{user.email}</TableCell>
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
