import { Box, Typography } from "@mui/material";

const Testimonials: React.FC = () => {
    return (
        <Box sx={{ padding: 4, backgroundColor: '#f7f9fb', textAlign: 'center' }}>
            <Typography variant="h4" sx={{ marginBottom: 2, fontWeight: 700 }}>
                What Our Clients Say
            </Typography>
            <Typography variant="body1" sx={{ maxWidth: 600, margin: '0 auto', color: '#555' }}>
                "Rudyard Technologies transformed our business with their innovative solutions and expert guidance. Their team is knowledgeable, responsive, and truly cares about their clients' success."
            </Typography>
        </Box>
    );
}

export default Testimonials;