import React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { Box } from '@mui/material';

export interface IService {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface ISericeTemplateProps {
  title: string;
  services: IService[];
}

const ServicesTemplate: React.FC<ISericeTemplateProps> = (props: ISericeTemplateProps) => {
  const [services]  = React.useState<IService[]>(props.services);
  const [title] = React.useState<string>(props.title);

  return (
    <Box sx={{ py: 0, background: '#f7f9fb' }}>
      <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700, py: 4 }}>
        {title}
      </Typography>
      <Grid container direction="row" spacing={2} alignItems="center">
        {services.map((service, idx) => (
          <Box key={idx} padding={2} sx={{ maxWidth: 320, width: '100%' }}>
            <Card
              elevation={4}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                px: 3,
                py: 5,
                borderRadius: 3,
                boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                background: '#fff',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-8px) scale(1.03)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
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
};

export default ServicesTemplate;
