import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

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
        <img
          src="/src/assets/rudylogo.png"
          alt="Logo"
          style={{ width: 'auto', height: 50, marginRight: 16 }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button color="inherit" href="#custom-software">Custom software</Button>
        <Button color="inherit" href="#consulting">Consulting</Button>
        <Button color="inherit" href="#security">Security</Button>
        <Button color="inherit" href="#about">About</Button>
        <Button color="error" href="#security">Get Started</Button>
      </Box>
    </Toolbar>
  </AppBar>
);


export default Header;