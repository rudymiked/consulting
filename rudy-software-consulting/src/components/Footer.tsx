import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const Footer: React.FC = () => (
  <Box component="footer" sx={{ py: 3, textAlign: 'center', bgcolor: 'background.paper', mt: 4 }}>
    <Typography variant="body2" color="text.secondary">
      © {new Date().getFullYear()} Rudy Software Consulting. All rights reserved.
    </Typography>
  </Box>
);

export default Footer;