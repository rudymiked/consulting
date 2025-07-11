import React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CodeIcon from '@mui/icons-material/Code';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SecurityIcon from '@mui/icons-material/Security';
import { Box } from '@mui/material';

const services = [
  {
    icon: <CodeIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Custom Software Development',
    description: 'Tailored solutions to fit your business needs, from web apps to enterprise systems. All in the cloud.',
  },
  {
    icon: <SupportAgentIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Consulting & Strategy',
    description: 'Expert advice to help you plan, architect, and deliver successful software projects.',
  },
  {
    icon: <SecurityIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Security & Compliance',
    description: 'Ensure your applications are secure and meet industry standards and regulations.',
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
    </Grid>
  </Box>
);

export default Services;