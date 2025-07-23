import { Box, Container } from "@mui/material";
import Services from "../components/Home/Services";
import Banner from "../components/Home/Banner";
import ExperienceFooter from "../components/ExperienceFooter";

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