import { Box, Container, Typography, Grid, Card, CardContent } from "@mui/material";
import React from "react";
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const HomeText: React.FC = () => {
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

    return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography
                    variant="h3"
                    component="h1"
                    sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}
                >
                    Expert Technology Solutions for Your Business
                </Typography>
                <Typography
                    variant="h6"
                    sx={{ color: 'text.secondary', mb: 4 }}
                >
                    We help businesses transform their technology, build innovative applications, and streamline their operations.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {services.map((service, index) => (
                    <Box key={index} sx={{ maxWidth: 300, width: '100%' }}>
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
        </Container>
    );
};

export default HomeText;
