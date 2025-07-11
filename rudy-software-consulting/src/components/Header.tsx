import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

const Header: React.FC = () => (
  <AppBar position="static" color="primary" elevation={2}>
    <Toolbar>
      <img src="/src/assets/icons/apple-touch-icon.png" alt="Logo" style={{ width: 40, height: 40, marginRight: 16 }} />
      <Typography variant="h6" component="div" align='left' sx={{ flexGrow: 1 }}>
        Rudy Software Consulting
      </Typography>
      <Box>
        <Button color="inherit" href="#custom-software">Custom software</Button>
        <Button color="inherit" href="#consulting">Consulting</Button>
        <Button color="inherit" href="#security">Security</Button>
      </Box>
    </Toolbar>
  </AppBar>
);

export default Header;