import { Box, Container, CssBaseline } from "@mui/material";
import Header from "../../components/Header";
import Services from "../../components/Services";
import Banner from "../../components/Banner";
import ExperienceFooter from "../../components/ExperienceFooter";
import Footer from "../../components/Footer";

const HomePage: React.FC = () => {
    return (
        <>
        <Container>
            <Box>
                <Banner />
            </Box>
            <Box my={4}>
                <Services />
            </Box>
        </Container>
        <ExperienceFooter />
      </>
    );
};

export default HomePage;