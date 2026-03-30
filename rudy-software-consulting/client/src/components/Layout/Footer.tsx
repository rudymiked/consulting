import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';
import rudyard from '/src/assets/rudyardtech.png';

const serviceLinks = [
  { label: 'Software Development', path: '/software' },
  { label: 'Managed IT Services', path: '/managedit' },
  { label: 'Consulting', path: '/consulting' },
  { label: 'Free Quote', path: '/contact' },
];

const companyLinks = [
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
  { label: 'Privacy Policy', path: '/privacy' },
  { label: 'Terms of Service', path: '/terms' },
];

const linkStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.6)',
  textDecoration: 'none',
  fontSize: '0.9rem',
  lineHeight: 2,
  display: 'block',
};

const Footer: React.FC = () => (
  <Box component="footer" sx={{ bgcolor: '#0f2744', color: 'white', pt: 7, pb: 4 }}>
    {/* Columns row */}
    <Box
      sx={{
        maxWidth: 1152,
        mx: 'auto',
        px: { xs: 3, md: 6 },
        display: 'flex',
        flexWrap: 'wrap',
        gap: { xs: 5, md: 8 },
        mb: 6,
      }}
    >
      {/* Brand column */}
      <Box sx={{ flex: '1 1 220px', maxWidth: 300 }}>
        <Box sx={{ mb: 2 }}>
          <img src={rudyard} alt="Rudyard Technologies" style={{ height: 40, width: 'auto' }} />
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.85 }}>
          Expert software development and IT consulting for businesses ready to grow with technology.
        </Typography>
      </Box>

      {/* Services column */}
      <Box sx={{ flex: '1 1 160px' }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            mb: 2,
            color: 'rgba(255,255,255,0.9)',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            fontSize: '0.72rem',
          }}
        >
          Services
        </Typography>
        {serviceLinks.map((item) => (
          <Link key={item.label} to={item.path} style={linkStyle}>
            {item.label}
          </Link>
        ))}
      </Box>

      {/* Company column */}
      <Box sx={{ flex: '1 1 160px' }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            mb: 2,
            color: 'rgba(255,255,255,0.9)',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            fontSize: '0.72rem',
          }}
        >
          Company
        </Typography>
        {companyLinks.map((item) => (
          <Link key={item.label} to={item.path} style={linkStyle}>
            {item.label}
          </Link>
        ))}
      </Box>
    </Box>

    {/* Bottom bar */}
    <Box
      sx={{
        maxWidth: 1152,
        mx: 'auto',
        px: { xs: 3, md: 6 },
        borderTop: '1px solid rgba(255,255,255,0.1)',
        pt: 3,
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
        © {new Date().getFullYear()} Rudyard Technologies. All rights reserved.
      </Typography>
      <Box sx={{ display: 'flex', gap: 3 }}>
        <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '0.82rem' }}>
          Privacy Policy
        </Link>
        <Link to="/terms" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '0.82rem' }}>
          Terms of Service
        </Link>
      </Box>
    </Box>
  </Box>
);

export default Footer;