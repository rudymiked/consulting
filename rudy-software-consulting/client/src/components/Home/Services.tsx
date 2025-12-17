import React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CodeIcon from '@mui/icons-material/Code';
import { Box, Button } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Link } from 'react-router-dom';

const services = [
  {
    icon: <CodeIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />,
    title: 'Software Development',
    description: 'Custom applications built with modern technologies. From web apps to enterprise solutions, we bring your ideas to life.',
  },
  {
    icon: <StorageIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />,
    title: 'Managed IT Services',
    description: 'Keep your business running smoothly with proactive monitoring, security management, and infrastructure support.',
  },
  {
    icon: <AutoAwesomeIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />,
    title: 'AI-Powered Solutions',
    description: 'Stuck building an app with ChatGPT? We can help you turn AI concepts into production-ready applications that actually work.',
  },
];

const Services: React.FC = () => (
  <Box sx={{ py: 6, background: '#f7f9fb' }}>
    <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
      Our Services
    </Typography>
    <Grid container spacing={4} justifyContent="center">
      {services.map((service, idx) => (
        <Box key={idx} sx={{ maxWidth: 300, width: '100%' }}>
          <Card
            elevation={4}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              px: 3,
              py: 5,
              borderRadius: 3,
              boxShadow: '0 4px 24px 0 rgba(0,0,0,0.07)',
              background: '#fff',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-8px) scale(1.03)',
                boxShadow: '0 8px 32px 0 rgba(0,0,0,0.12)',
              },
            }}
          >
            {service.icon}
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                {service.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {service.description}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      ))}
      <br />
      <Link to="/contact">
        <Button className="main-button" variant="contained" color="primary" sx={{ mt: 1 }}>
          Get Started
        </Button>
      </Link>
    </Grid>
  </Box>
);

export default Services;