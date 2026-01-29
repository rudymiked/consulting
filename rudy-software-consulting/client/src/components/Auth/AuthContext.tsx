import React, { createContext, useContext, useState, useEffect } from 'react';
import HttpClient from '../../services/Http/HttpClient';

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
        const storedToken = localStorage.getItem('admin_token');
        console.log('AuthProvider mounted.' + (storedToken != null ? ' Found stored admin_token.' : ' No admin_token found.'));

        if (storedToken) {
            setToken(storedToken);
            setIsAuthenticated(true);
            const payload = parseJwt(storedToken);
            setIsAdmin(payload?.siteAdmin || false);
        }
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
            localStorage.setItem('admin_token', token);
            setToken(token);
            setIsAuthenticated(true);
            const payload = parseJwt(token);
            setIsAdmin(payload?.siteAdmin || false);
        }
        catch (error: any) {
            throw new Error(error.message || 'Login failed');
        }
    };

    const logout = () => {
        console.log('Logging out, removing admin_token from localStorage.');
        localStorage.removeItem('admin_token');
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