import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => (
  <Box component="footer" sx={{ py: 3, textAlign: 'center', bgcolor: 'background.paper', mt: 4 }}>
    <Typography variant="body2" color="text.secondary">
      © {new Date().getFullYear()} Rudyard Software Consulting. All rights reserved. <Link to="/privacy">Privacy Policy</Link> | <Link to="/terms">Terms of Service</Link>
    </Typography>
  </Box>
);

export default Footer;