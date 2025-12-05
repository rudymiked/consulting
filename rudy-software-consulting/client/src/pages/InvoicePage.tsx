import { Box, Container } from "@mui/material";
import Invoice from "../components/Invoice/Invoice";
import { useParams } from "react-router-dom";
import React from "react";
import { useAppInsights } from "../services/Telemtry/AppInsightsProvider";

const InvoicePage: React.FC = () => {
    const { invoiceId: invoiceId } = useParams<{ invoiceId: string }>();
    const appInsights = useAppInsights();

      React.useEffect(() => {
        appInsights.trackEvent({ name: 'Invoice_Visit_' + invoiceId }, {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        });
        appInsights.trackPageView({ name: 'Invoice', uri: window.location.pathname });
      }, [appInsights]);

    return (
        <Box sx={{ pt: 9, pb: 7, backgroundColor: '#f0f4f8' }}>
            <Container maxWidth="xl">
                <Invoice invoiceId={invoiceId!} />
            </Container>
        </Box>
    );
}

export default InvoicePage;