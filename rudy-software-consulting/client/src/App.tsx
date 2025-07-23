import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Header from './components/Header';
import Footer from './components/Footer';
import './styles/main.css';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import SoftwarePage from './pages/Software';
import ConsultingPage from './pages/Consulting';
import HomePage from './pages/Home';
import { Box } from '@mui/material';
import ContactPage from './pages/Contact';
import AboutPage from './pages/About';
import PrivacyPage from './pages/PrivacyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

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