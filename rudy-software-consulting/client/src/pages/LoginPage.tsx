import React from 'react';
import LoginForm from '../components/Auth/LoginForm';
import { useAuth } from '../components/Auth/AuthContext';
import { Navigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const { isAuthenticated, login } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div>
      <LoginForm onLogin={login} />
    </div>
  );
};

export default LoginPage;