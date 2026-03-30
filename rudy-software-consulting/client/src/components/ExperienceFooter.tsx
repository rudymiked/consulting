import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import microsoft from '../assets/experience/microsoft.jpg';
import belcan from '../assets/experience/belcan.png';
import toyota from '../assets/experience/toyota.png';
import sikorsky from '../assets/experience/Sikorsky.png';
import pratt from '../assets/experience/pratt.png';

interface IExperience {
    logo: string;
    altText: string;
}

const experiences: IExperience[] = [
    { logo: microsoft, altText: 'Microsoft' },
    { logo: belcan, altText: 'Belcan' },
    { logo: toyota, altText: 'Toyota' },
    { logo: sikorsky, altText: 'Sikorsky' },
    { logo: pratt, altText: 'Pratt and Whitney' },
];

const ExperienceFooter: React.FC = () => (
    <Box sx={{ py: 7, bgcolor: '#ffffff', borderTop: '1px solid #E2E8F0' }}>
        <Container maxWidth="lg">
            <Typography
                variant="overline"
                sx={{
                    display: 'block',
                    textAlign: 'center',
                    color: '#94A3B8',
                    letterSpacing: 2,
                    fontWeight: 600,
                    mb: 4,
                    fontSize: '0.72rem',
                }}
            >
                Engineers with experience at leading companies
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: { xs: 5, md: 7 },
                }}
            >
                {experiences.map((exp, idx) => (
                    <Box
                        key={idx}
                        sx={{
                            opacity: 0.45,
                            filter: 'grayscale(100%)',
                            transition: 'opacity 0.25s, filter 0.25s',
                            '&:hover': { opacity: 1, filter: 'grayscale(0%)' },
                        }}
                    >
                        <img
                            src={exp.logo}
                            alt={exp.altText}
                            style={{ height: 36, width: 'auto', display: 'block' }}
                        />
                    </Box>
                ))}
            </Box>
        </Container>
    </Box>
);

export default ExperienceFooter;