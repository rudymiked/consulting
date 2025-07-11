import { Box, Button, Grid, Typography } from "@mui/material";

const Banner: React.FC = () => {
    return (
        <Box sx={{ py: 6, position: 'relative' }}>
            {/* Background image */}
            <Box sx={{ width: '100%' }}>
                <img 
                    src="src/assets/tech.jpg" 
                    alt="Banner Image" 
                    style={{ width: '100%', height: 'auto', borderRadius: 8 }} 
                />
            </Box>

            {/* Overlay box - positioned on top right of the image */}
            <Box
                sx={ (theme) =>({
                    position: 'absolute',
                    top: 100,
                    right: 20,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: 3,
                    borderRadius: 2,
                    maxWidth: 300,
                    boxShadow: 3,
                    [theme.breakpoints.down('sm')]: {
                    padding: 2,
                    height: '40%',
                    justifyContent: 'flex-start',
                    },
                })}
            >
                <Typography 
                    variant="h4"
                    component="h1"
                    gutterBottom   
                    sx={(theme) => ({
                    [theme.breakpoints.down('sm')]: {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '1.2rem', // Optional: scale down font size
                    },
                })}>
                    Software Solutions and Technology Consulting
                </Typography>
                <Typography 
                    variant="body1" 
                    color="text.secondary"   
                    sx={(theme) => ({
                    [theme.breakpoints.down('sm')]: {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '1.2rem', // Optional: scale down font size
                    },
                })}>
                    Transform your ideas into reality with expert custom tailored software solutions. Our services include custom software development, SaaS, API integrations, and enterprise consulting.
                </Typography>
                <Button variant="contained" color="primary" href="#contact" sx={{ mt: 1 }}>
                    Get Started
                </Button>
            </Box>
        </Box>
    );
}

export default Banner;
