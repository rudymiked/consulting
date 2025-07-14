import { Box, Button, Grid } from "@mui/material";
import Experience from "../../components/Experience";
import ServicesTemplate from "../../components/ServicesTemplate";
import CodeIcon from '@mui/icons-material/Code';
import { CloudSync, SettingsSuggest } from '@mui/icons-material';

const developmentServices = [
  {
    icon: <CodeIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Web Application Development',
    description: 'Build scalable, responsive web apps tailored to your business goals.',
  },
  {
    icon: <SettingsSuggest color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Automated Services',
    description: 'Streamline operations with smart automation and seamless API integrations taht work while you work.',
  },
  {
    icon: <CloudSync color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Cloud Development',
    description: 'Design and deploy secure, cloud-native solutions with modern architectures.',
  },
];

const modenizationServices = [
  {
    icon: <CodeIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Web Application Development',
    description: 'Build scalable, responsive web apps tailored to your business goals.',
  },
  {
    icon: <SettingsSuggest color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Automated Services',
    description: 'Streamline operations with smart automation and seamless API integrations taht work while you work.',
  },
  {
    icon: <CloudSync color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Cloud Development',
    description: 'Design and deploy secure, cloud-native solutions with modern architectures.',
  },
];

const SoftwarePage: React.FC = () => {
    return (
        <div>
            <Grid container direction="column" alignItems="center" spacing={2} sx={{ mt: 4 }}>
                <Box>
                    <ServicesTemplate title="Software Development" services={developmentServices} />
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
                    <ServicesTemplate title="Software Development" services={modenizationServices} />
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
export default SoftwarePage;