import { Box, Typography } from "@mui/material";

const AboutPage: React.FC = () => {
    return (
        <Box sx={{ py: 0, background: '#f7f9fb', maxWidth: '800px', margin: 'auto', padding: 4 }}>
            <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700, py: 4 }}>
                About Us
            </Typography>
            <p>Rudyard Software Consulting is dedicated to delivering innovative software solutions that empower businesses to thrive in the digital age.</p>
            <p>With a focus on quality, performance, and user experience, we help our clients achieve their goals through custom software development, consulting, and support services.</p>
            <p>Located in Seattle.</p>
            {/* <img src="src/assets/rudyard.png" alt="About Us" style={{ width: '50%', height: 'auto', borderRadius: 8, marginTop: 20 }} /> */}
        </Box>
    );
}

export default AboutPage;