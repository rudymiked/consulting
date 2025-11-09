import { Box, Container } from "@mui/material";
import Invoice from "../components/Invoice/Invoice";
import { useParams } from "react-router-dom";
import React from "react";

const InvoicePage: React.FC = () => {
    const { invoiceId: invoiceId } = useParams<{ invoiceId: string }>();

    return (
        <Box sx={{ pt: 9, pb: 7, backgroundColor: '#f0f4f8' }}>
            <Container maxWidth="xl">
                <Invoice invoiceId={invoiceId!} />
            </Container>
        </Box>
    );
}

export default InvoicePage;