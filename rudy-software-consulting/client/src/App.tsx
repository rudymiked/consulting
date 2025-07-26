import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import './styles/main.css';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import SoftwarePage from './pages/SoftwarePage';
import ConsultingPage from './pages/ConsultingPage';
import HomePage from './pages/Home';
import { Box } from '@mui/material';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import SecurityAndCompliancePage from './pages/SecurityAndCompliancePage';

const App: React.FC = () => {

  React.useEffect(() => {
    console.log("API url:", import.meta.env);
    
    fetch(`https://${import.meta.env.VITE_API_URL}/api/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => response.text())
      .then(data => console.log('API response:', data))
      .catch(error => console.error('Error fetching API:', error));
  }, []);

  return (
    <Router>
        <CssBaseline />
        <Header />
        <Box sx={{ paddingTop: 8, padding: 2 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/software" element={<SoftwarePage />} />
            <Route path="/consulting" element={<ConsultingPage />} />
            <Route path="/security" element={<SecurityAndCompliancePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
          </Routes>
        </Box>
        <Footer />
    </Router>
  );
};

export default App;