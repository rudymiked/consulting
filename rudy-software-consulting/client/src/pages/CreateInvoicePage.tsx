import { Box, Container } from "@mui/material";
import CreateInvoice from "../components/Invoice/CreateInvoice";

const CreateInvoicePage: React.FC = () => {
    return (
        <Box sx={{ pt: 9, pb: 7, backgroundColor: '#f0f4f8' }}>
            <Container maxWidth="xl">
                <CreateInvoice />
            </Container>
        </Box>
    );
}

export default CreateInvoicePage;