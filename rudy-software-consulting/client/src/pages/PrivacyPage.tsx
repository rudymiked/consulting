import { Box, Container } from "@mui/material";
import Privacy from "../components/Privacy";

const PrivacyPage: React.FC = () => {
    return (
        <Box sx={{ pt: 9, pb: 7, backgroundColor: '#f0f4f8' }}>
            <Container maxWidth="xl">
                <Privacy />
            </Container>
        </Box>
    );
}

export default PrivacyPage;