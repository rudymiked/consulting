import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import { Link } from 'react-router-dom';
import { Tab } from '@mui/material';

const Header: React.FC = () => (
  <AppBar
    position="static"
    elevation={2}
    component={'header'}
    sx={{
      backgroundColor: '#FEFDFB',
      color: 'black',
      padding: '10px 0',
    }}
  >
    <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/">
            <img
            src="/src/assets/rudyard.png"
            alt="Logo"
            style={{ width: 'auto', height: 50, marginRight: 16 }}
            />
        </Link>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Tab component={Link} to="/software" label="Custom software" />
        <Tab component={Link} to="/consulting" label="Consulting" />
        <Tab component={Link} to="/security" label="Security" />
        <Tab component={Link} to="/contact" label="Get Started" />
        <Tab component={Link} to="/about" label="About" />
        {/* <Button color="inherit" href="/consulting">Consulting</Button>
        <Button color="inherit" href="/security">Security</Button>
        <Button color="inherit" href="/about">About</Button>
        <Button color="error" href="/contact">Get Started</Button> */}
      </Box>
    </Toolbar>
  </AppBar>
);


export default Header;