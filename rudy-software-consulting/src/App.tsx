import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Header from './components/Header';
import Footer from './components/Footer';
import './styles/main.css';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import SoftwarePage from './assets/pages/Software';
import ConsultingPage from './assets/pages/Consulting';
import HomePage from './assets/pages/Home';
import { Box } from '@mui/material';
import ContactPage from './assets/pages/Contact';
import AboutPage from './assets/pages/About';

const App: React.FC = () => {
  return (
    <Router>
        <CssBaseline />
        <Header />
        <Box sx={{ paddingTop: 8, padding: 2 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/software" element={<SoftwarePage />} />
            <Route path="/consulting" element={<ConsultingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </Box>
        <Footer />
    </Router>
  );
};

export default App;