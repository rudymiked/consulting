import React from 'react';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Header from './components/Header';
import Footer from './components/Footer';
import Services from './components/Services';
import './styles/main.css';

const App: React.FC = () => {
  return (
    <>
      <CssBaseline />
      <Header />
      <Container maxWidth="md">
        <Box my={4}>
          <Services />
        </Box>
      </Container>
      <Footer />
    </>
  );
};

export default App;