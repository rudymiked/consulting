import React, { createContext, useContext, useState, useEffect } from 'react';
import HttpClient from '../../services/Http/HttpClient';

interface IApiErrorPayload {
    error?: string;
    message?: string;
}

interface IAuthContextType {
    isAuthenticated: boolean;
    isAdmin: boolean;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

interface ITokenPayload {
    email: string;
    clientId: string;
    siteAdmin: boolean;
}

const parseJwt = (token: string): ITokenPayload | null => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

const AuthContext = createContext<IAuthContextType>({
    isAuthenticated: false,
    isAdmin: false,
    token: null,
    login: async () => { },
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const httpClient = new HttpClient();

    useEffect(() => {
        // Token is stored in memory only (in React state)
        // Users will need to re-authenticate on page reload
        // This prevents XSS attacks from accessing persistent storage
        console.log('AuthProvider mounted. Token is memory-only.');
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const res = await httpClient.post<{ token: string; error?: string }>({
                url: '/api/login',
                token: '',
                data: { email, password },
            });

            const { token, error } = res;
            if (error) {
                throw new Error(error);
            }
            if (!token) throw new Error('No token received');
            // Token stored in memory only (React state), not persisted to localStorage
            setToken(token);
            setIsAuthenticated(true);
            const payload = parseJwt(token);
            setIsAdmin(payload?.siteAdmin || false);
        }
        catch (error: any) {
            const apiMessage = (error?.response?.data as IApiErrorPayload | undefined)?.error
                || (error?.response?.data as IApiErrorPayload | undefined)?.message;
            throw new Error(apiMessage || error.message || 'Login failed');
        }
    };

    const logout = () => {
        console.log('Logging out, clearing authentication state.');
        setToken(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isAdmin, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;