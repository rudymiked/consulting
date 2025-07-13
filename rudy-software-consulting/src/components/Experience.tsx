import React from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';

const milestones: string[] = [
    "15+ years of experience.",
    "Dozens of successful projects.",
    "Industries served: Retail, Tech, Real Estate, and more.",
]

const Experience: React.FC = () => (
  <Box sx={{ pt: 9, pb: 7, backgroundColor: '#f0f4f8' }}>
    <Container maxWidth="xl">
      <Typography
        variant="h5"
        align="center"
        fontWeight={700}
        gutterBottom
        sx={{ mb: 5 }}
      >
        Experience where it counts
      </Typography>
      <Grid container spacing={4} justifyContent="center">
        {milestones.map((milestone, index) => (
          <Box key={index}>
            <Box textAlign="center">
              <Typography
                variant="h6"
                fontWeight={700}
                color='#025680'
                gutterBottom
              >
                {milestone}
              </Typography>
            </Box>
          </Box>
        ))}
      </Grid>
    </Container>
  </Box>
);

export default Experience;
