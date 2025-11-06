import React from 'react';
import { Box, Typography, Paper, Button, Grid } from '@mui/material';
import { useAuth } from '../Auth/AuthContext';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Admin Dashboard
        </Typography>
        <Button onClick={logout} variant="outlined" color="primary">
          Logout
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Box>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Invoices
            </Typography>
            <Link to="/createinvoice">
              <Button variant="contained" className="main-button">
                Create Invoice
              </Button>
            </Link>
          </Paper>
        </Box>

        <Box>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Content Management
            </Typography>
            <Button variant="contained" className="main-button" disabled>
              Manage Content
            </Button>
          </Paper>
        </Box>

        <Box>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Analytics
            </Typography>
            <Button variant="contained" className="main-button" disabled>
              View Reports
            </Button>
          </Paper>
        </Box>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;