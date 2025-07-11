import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Grid } from '@mui/material';

interface IExperience {
    logo: string;
    altText: string;
}

const ExperienceFooter: React.FC = () => {
    const [experiences, setExperiences] = React.useState<IExperience[]>([
        { logo: 'src/assets/experience/microsoft.jpg', altText: 'Microsoft Logo' },
        { logo: 'src/assets/experience/belcan.png', altText: 'Belcan Logo' },
        { logo: 'src/assets/experience/toyota.png', altText: 'Toyota Logo' },
        { logo: 'src/assets/experience/Sikorsky.png', altText: 'Sikorsky Logo' },
        { logo: 'src/assets/experience/pratt.png', altText: 'Pratt and Whitney Logo' },
        //{ logo: 'src/assets/experience/lexmark.png', altText: 'Lexmark Logo' },
    ]);

    return (
        <Box component="footer" sx={{ py: 3, textAlign: 'center', bgcolor: 'background.paper', mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
                <strong>Powdered by engineers with experience at:</strong>
                <br />
                <br />
                <Grid container spacing={4} justifyContent="center">
                    {experiences.map((experience, idx) => (
                        <Box key={idx} sx={{ maxWidth: 300, width: '100%' }}>
                            <img src={experience.logo} alt={experience.altText} style={{ width: 100, height: 'auto', marginBottom: 10, alignContent:"center", verticalAlign:"center" }} />
                        </Box>
                    ))}
                </Grid>
            </Typography>
        </Box>
    );
}

export default ExperienceFooter;