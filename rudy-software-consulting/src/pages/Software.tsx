import { Box, Button, Grid } from "@mui/material";
import Experience from "../components/Experience";
import ServicesTemplate from "../components/ServicesTemplate";
import CodeIcon from '@mui/icons-material/Code';
import { CloudDone, CloudSync, ImportantDevices, QueryStats, SettingsSuggest } from '@mui/icons-material';
import { Link } from "react-router-dom";

const developmentServices = [
  {
    icon: <CodeIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Web Application Development',
    description: 'Build scalable, responsive web apps tailored to your business goals.',
  },
  {
    icon: <SettingsSuggest color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Automated Services',
    description: 'Streamline operations with smart automation and seamless API integrations that work while you work.',
  },
  {
    icon: <CloudSync color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Cloud Development',
    description: 'Design and deploy secure, cloud-native solutions with modern architectures.',
  },
];

const modenizationServices = [
  {
    icon: <ImportantDevices color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Modernize Legacy Systems',
    description: 'Transform outdated systems with modern technologies for improved performance and scalability. Upgrade your tech stack to stay competitive and compliant.',
  },
  {
    icon: <CloudDone color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Migrate to the cloud',
    description: 'Seamlessly transition to cloud-based solutions for enhanced flexibility and cost-efficiency. Leverage cloud services to scale your operations and improve accessibility.',
  },
  {
    icon: <QueryStats color="primary" sx={{ fontSize: 48, mb: 2 }} />,
    title: 'Rearchitect and Optimize',
    description: 'Reengineer your applications for better performance and maintainability. Optimize existing codebases to reduce technical debt and improve user experience.',
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
                    <ServicesTemplate title="Modernization" services={modenizationServices} />
                </Box>
                <Box>
                    <Link to="/contact">
                        <Button className="main-button" variant="contained" color="primary" sx={{ mt: 1 }}>
                            Get Started
                        </Button>
                    </Link>
                </Box>
            </Grid>
        </div>
    );
}
export default SoftwarePage;