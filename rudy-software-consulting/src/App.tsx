import React from 'react';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Header from './components/Header';
import Footer from './components/Footer';
import Services from './components/Services';
import './styles/main.css';
import ExperienceFooter from './components/ExperienceFooter';
import Banner from './components/Banner';

const App: React.FC = () => {
  return (
    <>
      <CssBaseline />
      <Header />
      <Container>
        <Box>
          <Banner />
        </Box>
        <Box my={4}>
          <Services />
        </Box>
      </Container>
      <ExperienceFooter />
      <Footer />
    </>
  );
};

export default App;