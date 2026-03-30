import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CodeIcon from '@mui/icons-material/Code';
import { Box, Button, Container } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Link } from 'react-router-dom';

const services = [
  {
    icon: <CodeIcon sx={{ fontSize: 28, color: '#2563eb' }} />,
    title: 'Software Development',
    description: 'Custom web, desktop, and mobile applications built with modern technologies. From MVPs to enterprise platforms — we bring your ideas to life.',
    path: '/software',
  },
  {
    icon: <StorageIcon sx={{ fontSize: 28, color: '#2563eb' }} />,
    title: 'Managed IT Services',
    description: 'Keep your business running smoothly with proactive monitoring, security management, and infrastructure support tailored to your needs.',
    path: '/managedit',
  },
  {
    icon: <AutoAwesomeIcon sx={{ fontSize: 28, color: '#2563eb' }} />,
    title: 'AI-Powered Solutions',
    description: 'Turn AI concepts into production-ready applications. We help you integrate and deploy real AI solutions that actually scale in your business.',
    path: '/consulting',
  },
];

const Services: React.FC = () => (
  <Box sx={{ py: 10, background: '#F8FAFC' }}>
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', mb: 7 }}>
        <Typography
          variant="overline"
          sx={{ color: '#2563eb', fontWeight: 700, letterSpacing: 2, fontSize: '0.75rem' }}
        >
          What We Do
        </Typography>
        <Typography
          variant="h2"
          sx={{ fontWeight: 800, mt: 0.5, mb: 2, color: '#0f2744', fontSize: { xs: '1.9rem', md: '2.4rem' } }}
        >
          Our Services
        </Typography>
        <Typography variant="body1" sx={{ color: '#64748B', maxWidth: 560, mx: 'auto', lineHeight: 1.8 }}>
          End-to-end technology solutions that help businesses innovate, scale, and stay competitive.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
        {services.map((service, idx) => (
          <Box key={idx} sx={{ flex: '1 1 260px', maxWidth: 360, minWidth: 240, display: 'flex' }}>
            <Card
              elevation={0}
              sx={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                px: 3.5,
                py: 4,
                borderRadius: 3,
                border: '1px solid #E2E8F0',
                background: '#fff',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: '0 12px 40px rgba(37,99,235,0.12)',
                  borderColor: '#93c5fd',
                },
              }}
            >
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  borderRadius: 2,
                  bgcolor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2.5,
                }}
              >
                {service.icon}
              </Box>
              <CardContent sx={{ p: 0, flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#0f2744' }}>
                  {service.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.75 }}>
                  {service.description}
                </Typography>
              </CardContent>
              <Box sx={{ mt: 3 }}>
                <Button
                  component={Link}
                  to={service.path}
                  sx={{
                    textTransform: 'none',
                    color: '#2563eb',
                    fontWeight: 600,
                    p: 0,
                    fontSize: '0.9rem',
                    '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                  }}
                >
                  Learn more →
                </Button>
              </Box>
            </Card>
          </Box>
        ))}
      </Box>

      <Box sx={{ textAlign: 'center', mt: 7 }}>
        <Button
          component={Link}
          to="/contact"
          variant="contained"
          size="large"
          sx={{
            bgcolor: '#2563eb',
            color: 'white',
            fontWeight: 700,
            px: 5,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1rem',
            '&:hover': { bgcolor: '#1d4ed8' },
          }}
        >
          Get a Free Quote
        </Button>
      </Box>
    </Container>
  </Box>
);

export default Services;