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
            <Grid container spacing={2}>
                {/* Overlay box - positioned on top right of the image */}
                <Box
                    sx={(theme) => ({
                        position: 'absolute',
                        top: 100,
                        left: 20,
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
                    <Box>
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
                            Software Solutions and Consulting
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
                            Transform your ideas into reality with expert custom tailored software. Our services include custom software development for web, desktop and mobile, SaaS, API integrations, and enterprise consulting.
                        </Typography>
                        <Button className="main-button" variant="contained" color="primary" href="#contact" sx={{ mt: 1 }}>
                            Get Started
                        </Button>
                    </Box>
                </Box>
                {/* <Box
                    sx={(theme) => ({
                        position: 'absolute',
                        top: 130,
                        right: 20,
                        boxShadow: 0,
                        [theme.breakpoints.down('sm')]: {
                            padding: 2,
                            height: '40%',
                            justifyContent: 'flex-start',
                        },
                    })}
                >
                    <img src="/src/assets/dash.png" style={{ width: 450, height: 'auto' }} />
                </Box>
                */}
                <Box
                    sx={(theme) => ({
                        position: 'absolute',
                        top: 120,
                        right: 75,
                        boxShadow: 0,
                        [theme.breakpoints.down('md')]: {
                            display: 'none',
                        },
                    })}
                >
                    <img src="/src/assets/marathon.png" style={{ width: 450, height: 'auto' }} />
                </Box>
                <Box
                    sx={(theme) => ({
                        position: 'absolute',
                        top: 70,
                        right: 20,
                        boxShadow: 0,
                        [theme.breakpoints.down('md')]: {
                            display: 'none',
                        },
                    })}
                >
                    <img src="/src/assets/realestatedash.png" style={{ width: 450, height: 'auto' }} />
                </Box>
            </Grid>
        </Box>
    );
}

export default Banner;
