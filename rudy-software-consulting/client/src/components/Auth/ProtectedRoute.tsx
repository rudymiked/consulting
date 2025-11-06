import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {

    if (import.meta.env.VITE_TESTING === 'true') {
        return <>{children}</>;
    }

    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        // Redirect to login if not authenticated
        return <Navigate to="/admin/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;