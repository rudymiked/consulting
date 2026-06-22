import React, { Suspense, lazy } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import './styles/main.css';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './components/Auth/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import HttpClient from './services/Http/HttpClient';
import { useAuth } from './components/Auth/AuthContext';
import { useAppInsights } from './services/Telemtry/AppInsightsProvider';

// Lazy-loaded page routes — each becomes its own JS chunk
const HomePage = lazy(() => import('./pages/Home'));
const SoftwarePage = lazy(() => import('./pages/SoftwarePage'));
const ConsultingPage = lazy(() => import('./pages/ConsultingPage'));
const ManagedITPage = lazy(() => import('./pages/ManagedIT'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegistrationPage = lazy(() => import('./pages/RegistrationPage'));
const InvoicePage = lazy(() => import('./pages/InvoicePage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const CreateInvoicePage = lazy(() => import('./pages/CreateInvoicePage'));
const EditInvoicePage = lazy(() => import('./pages/EditInvoicePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const UserManagement = lazy(() => import('./components/Admin/UserManagement'));
const ClientManagement = lazy(() => import('./components/Admin/ClientManagement'));
const ClientDashboard = lazy(() => import('./components/Admin/ClientDashboard'));

const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress />
  </Box>
);

const App: React.FC = () => {
  const httpClient = new HttpClient();
  const auth = useAuth();
  const appInsights = useAppInsights();

  React.useEffect(() => {
    httpClient.get<void>({
      url: '/api/',
      token: auth.token || '',
    })
      .then(() => {
        httpClient.post<{ message?: string; error?: string }>({
          url: '/api/table-warmer',
          token: auth.token || ''
        }).catch(() => { /* silent warm-up */ });
      })
      .catch(() => { /* silent warm-up */ });
  }, []);
  
  React.useEffect(() => {
    appInsights.trackEvent({ name: 'Site_Visit' }, {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
    appInsights.trackPageView({ name: 'Home', uri: window.location.pathname });
  }, [appInsights]);

  return (
    <AuthProvider>
      <Router>
        <CssBaseline />
        <Header />
        <Box component="main" sx={{ paddingTop: 8, padding: 2 }}>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/software" element={<SoftwarePage />} />
            <Route path="/consulting" element={<ConsultingPage />} />
            <Route path="/managedit" element={<ManagedITPage />} />
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
            <Route
              path="/invoice/:invoiceId/edit"
              element={
                <ProtectedRoute>
                  <EditInvoicePage />
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
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/clients"
              element={
                <ProtectedRoute>
                  <ClientManagement />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<div>404 Not Found</div>} />
          </Routes>
          </Suspense>
        </Box>
        <Footer />
      </Router>
    </AuthProvider>
  );
};

export default App;