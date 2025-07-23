import { Box, Typography } from "@mui/material";
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
            {/* <img src="src/assets/rudyard.png" alt="About Us" style={{ width: '50%', height: 'auto', borderRadius: 8, marginTop: 20 }} /> */}
        </Box>
    );
}

export default AboutPage;