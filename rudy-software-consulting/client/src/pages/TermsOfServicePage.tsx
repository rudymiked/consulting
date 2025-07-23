import { Box, Container } from "@mui/material";
import TermsOfService from "../components/TermsOfService";

const TermsOfServicePage: React.FC = () => {
    return (
        <Box sx={{ pt: 9, pb: 7, backgroundColor: '#f0f4f8' }}>
            <Container maxWidth="xl">
                <TermsOfService />
            </Container>
        </Box>
    );
}

export default TermsOfServicePage;