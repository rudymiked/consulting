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
import PaymentPage from './pages/PaymentPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import InvoicePage from './pages/InvoicePage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import { AuthProvider } from './components/Auth/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';

const App: React.FC = () => {
  React.useEffect(() => {
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
    <AuthProvider>
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
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/payment/:invoiceId" element={<PaymentPage />} />
              <Route path="/createinvoice" element={<CreateInvoicePage />} />
              <Route path="/invoice/" element={<InvoicePage />} />
              <Route path="/invoice/:invoiceId" element={<InvoicePage />} />
              <Route path="/admin/login" element={<LoginPage />} />
              <Route 
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<div>404 Not Found</div>} />
            </Routes>
          </Box>
          <Footer />
      </Router>
    </AuthProvider>
  );
};

export default App;