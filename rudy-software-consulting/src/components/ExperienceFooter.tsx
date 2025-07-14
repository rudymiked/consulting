import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Grid } from '@mui/material';
import microsoft from '../assets/experience/microsoft.jpg';
import belcan from '../assets/experience/belcan.png';
import toyota from '../assets/experience/toyota.png';
import sikorsky from '../assets/experience/Sikorsky.png';
import pratt from '../assets/experience/pratt.png';


interface IExperience {
    logo: string;
    altText: string;
}

const ExperienceFooter: React.FC = () => {
    const [experiences, setExperiences] = React.useState<IExperience[]>([
        { logo: microsoft, altText: 'Microsoft Logo' },
        { logo: belcan, altText: 'Belcan Logo' },
        { logo: toyota, altText: 'Toyota Logo' },
        { logo: sikorsky, altText: 'Sikorsky Logo' },
        { logo: pratt, altText: 'Pratt and Whitney Logo' },
        //{ logo: 'src/assets/experience/lexmark.png', altText: 'Lexmark Logo' },
    ]);

    return (
        <Box component="footer" sx={{ py: 3, textAlign: 'center', bgcolor: 'background.paper', mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
                <strong>Powdered by engineers with experience at:</strong>
                <br />
                <br />
                <Grid container spacing={2} justifyContent="center">
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