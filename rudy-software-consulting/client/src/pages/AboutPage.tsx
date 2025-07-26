import { Box, List, ListItem, ListItemText, Typography } from "@mui/material";
import seattle from '../assets/seattle.jpg';

const AboutPage: React.FC = () => {
    return (
        <Box sx={{ py: 0, background: '#f7f9fb', maxWidth: '800px', margin: 'auto', padding: 4 }}>
            <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700, py: 4 }}>
                About Us
            </Typography>
            <img src={seattle} alt="Seattle Skyline" style={{ width: '100%', height: 'auto', borderRadius: 8, marginBottom: 20 }} />
            <p>Located in Seattle, Rudyard Technologies is dedicated to delivering innovative software solutions that empower businesses to grow and thrive.</p>
            <p>With a focus on quality, performance, and user experience, we help our clients achieve their goals through custom software development, consulting, and IT services.</p>
            <p>We specialize in turning outdated infrastructure into secure, scalable platforms — integrating compliance frameworks like SOC 2, GDPR, and HIPAA from the ground up. Our services span custom software development, cloud transformation, and security audits, all designed to minimize risk and maximize operational efficiency.
                Whether you're a small business looking to upgrade legacy systems or a consultancy scaling SaaS tools for broader impact, Rudyard Technologies provides:</p>
            <List>
                <ListItem>
                    <ListItemText primary="Technical Precision — Expertise in full stack software development and API integration ensures seamless, high-performance apps." />
                </ListItem>
                <ListItem>
                    <ListItemText primary="Security by Design — We identify and replace outdated libraries, enforce best practices, and align your stack with modern compliance standards." />
                </ListItem>
                <ListItem>
                    <ListItemText primary="Scalable Architecture — From cloud migration to cost-efficient hosting, we engineer future-proof solutions tailored to your growth." />
                </ListItem>
            </List>

            <p>
                Our methodical, collaborative approach ensures each project is not only technically sound but deeply aligned with your business goals. Let’s build something that works beautifully—and lasts.
            </p>

            {/* <img src="src/assets/rudyard.png" alt="About Us" style={{ width: '50%', height: 'auto', borderRadius: 8, marginTop: 20 }} /> */}
        </Box>  
    );
}

export default AboutPage;