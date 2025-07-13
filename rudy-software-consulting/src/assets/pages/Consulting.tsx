import { Box, Button, Grid } from "@mui/material";
import Experience from "../../components/Experience";
import ServicesTemplate from "../../components/ServicesTemplate";
import CodeIcon from '@mui/icons-material/Code';
import { CloudSync, SettingsSuggest } from '@mui/icons-material';

const services = [
  {
    icon: <CodeIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Cloud Migration',
    description: 'Migrate your services to cloud-native architectures for scalability, cost-efficiency, and remote access.',
  },
  {
    icon: <SettingsSuggest color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Cybersecurity & Compliance',
    description: 'With AI-powered threats and stricter data regulations, companies need airtight security. We help you build robust security frameworks and ensure compliance with industry standards.',
  },
  {
    icon: <CloudSync color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Cybersecurity & Compliance',
    description: 'Organizations are racing to integrate AI into operations, but need guidance to do it responsibly.',
  },
];

const ConsultingPage: React.FC = () => {
    return (
        <div>
            <Grid container direction="column" alignItems="center" spacing={2} sx={{ mt: 4 }}>
                <Box>
                    <ServicesTemplate title="Consulting Services" services={services} />
                </Box>
                {/* <Box>
                    <Grid direction="row" spacing={2} container justifyContent="center" sx={{ mt: 4 }}>
                    <Box
                        sx={(theme) => ({
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
                </Box> */}
                <Box>
                    <Experience />
                </Box>
                <Box>
                    <Button className="main-button" variant="contained" color="primary" href="#contact" sx={{ mt: 1 }}>
                        Get Started
                    </Button>
                </Box>
            </Grid>
        </div>
    );
}

export default ConsultingPage;