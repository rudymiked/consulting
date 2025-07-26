import { Box, Button, Grid } from "@mui/material";
import Experience from "../components/Experience";
import ServicesTemplate from "../components/ServicesTemplate";
import ShieldIcon from '@mui/icons-material/Security';
import GavelIcon from '@mui/icons-material/Gavel';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { Link } from "react-router-dom";

const services = [
  {
    icon: <ShieldIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Legacy Software Modernization',
    description: 'Replace outdated systems and libraries with modern, secure alternatives — boosting performance and protecting against known vulnerabilities.',
  },
  {
    icon: <GavelIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Regulatory Readiness Audits',
    description: 'Ensure legacy dependencies don’t compromise compliance with GDPR, HIPAA, SOC 2 and more. We assess gaps and guide clean migrations.',
  },
  {
    icon: <VerifiedUserIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Software Risk Intelligence',
    description: 'Analyze your tech stack for out-of-date frameworks, misconfigurations, or third-party exposure — and implement a strategy to update and harden it.',
  },
];

const SecurityAndCompliancePage: React.FC = () => {
  return (
    <div>
      <Grid container direction="column" alignItems="center" spacing={2} sx={{ mt: 4 }}>
        <Box>
          <ServicesTemplate title="Security & Compliance Solutions" services={services} />
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

export default SecurityAndCompliancePage;