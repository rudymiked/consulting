import { Box, Typography } from "@mui/material";
import ContactForm from "../components/Contact/ContactForm";
import React from "react";
import { useAppInsights } from "../services/Telemtry/AppInsightsProvider";


const ContactPage: React.FC = () => {
    const appInsights = useAppInsights();
    
    React.useEffect(() => {
        appInsights.trackEvent({ name: 'Contact_Visit' }, {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
        });
        appInsights.trackPageView({ name: 'Contact', uri: window.location.pathname });
    }, [appInsights]);

    return (
        <Box sx={{ py: 0, background: '#f7f9fb', maxWidth: '800px', margin: 'auto', padding: 4 }}>
            <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700, py: 4 }}>
                Let’s build something great—get in touch!
            </Typography>
            <ContactForm />
        </Box>
    );
}

export default ContactPage;
