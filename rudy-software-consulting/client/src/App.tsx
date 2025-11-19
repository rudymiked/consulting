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
import CreateInvoicePage from './pages/CreateInvoicePage';
import InvoicePage from './pages/InvoicePage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import { AuthProvider } from './components/Auth/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import RegistrationPage from './pages/RegistrationPage';
import InvoicesPage from './pages/InvoicesPage';
import HttpClient from './services/Http/HttpClient';
import { useAuth } from './components/Auth/AuthContext';

const App: React.FC = () => {
  const httpClient = new HttpClient();
  const auth = useAuth();

  React.useEffect(() => {
    httpClient.get<void>({
      url: '/api/',
      token: auth.token || '',
    })
      .then(() => {
        httpClient.post<{ message?: string; error?: string }>({
          url: '/api/table-warmer',
          token: auth.token || ''
        }).then((res) => {
          console.log(res);
        }).catch((err) => {
          console.error(err);
        });

        console.log('API is reachable');
      })
      .catch(() => {
        console.error('Error reaching API');
      });
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
            <Route
              path="/createinvoice"
              element={
                <ProtectedRoute>
                  <CreateInvoicePage />
                </ProtectedRoute>
              }
            />
            <Route path="/invoices/" element={<InvoicesPage />} />
            <Route path="/invoice/:invoiceId" element={<InvoicePage />} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
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