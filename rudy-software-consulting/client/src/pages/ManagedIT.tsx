import { Box, Button, Grid } from "@mui/material";
import Experience from "../components/Experience";
import ServicesTemplate from "../components/ServicesTemplate";
import ShieldIcon from '@mui/icons-material/Security';
import { Link } from "react-router-dom";
import { useAppInsights } from "../services/Telemtry/AppInsightsProvider";
import React from "react";
import { Devices, Lan } from "@mui/icons-material";

const services = [
  {
    icon: <Devices color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Proactive IT Monitoring & Support',
    description: 'Round-the-clock monitoring of your infrastructure with rapid response to issues before they impact your business. Minimize downtime with our managed support services.',
  },
  {
    icon: <ShieldIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Network & Security Management',
    description: 'Secure and optimized networks with advanced threat detection, patch management, and security updates. Protect your business while maintaining peak performance.',
  },
  {
    icon: <Lan color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Infrastructure & Cloud Services',
    description: 'Manage your on-premises and cloud infrastructure efficiently. From server maintenance to cloud optimization, we handle the technical complexity.',
  },
];

const ManagedITPage: React.FC = () => {
  const appInsights = useAppInsights();
  React.useEffect(() => {
    appInsights.trackEvent({ name: 'ManagedIT_Visit' }, {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
    appInsights.trackPageView({ name: 'ManagedIT', uri: window.location.pathname });
  }, [appInsights]);

  return (
    <div>
      <Grid container direction="column" alignItems="center" spacing={2} sx={{ mt: 4 }}>
        <Box>
          <ServicesTemplate title="Managed IT Services" services={services} />
        </Box>

        <Box>
          <Experience />
        </Box>

        <Box>
          <Link to="/contact">
            <Button className="main-button" variant="contained" color="primary" sx={{ mt: 1 }}>
              Schedule a Consultation
            </Button>
          </Link>
        </Box>
      </Grid>
    </div>
  );
};

export default ManagedITPage;