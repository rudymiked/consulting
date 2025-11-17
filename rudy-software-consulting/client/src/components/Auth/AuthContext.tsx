import React, { createContext, useContext, useState, useEffect } from 'react';

interface IAuthContextType {
    isAuthenticated: boolean;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<IAuthContextType>({
    isAuthenticated: false,
    token: null,
    login: async () => { },
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const storedToken = localStorage.getItem('admin_token');

        console.log('AuthProvider mounted.' + (storedToken ? ' Found stored admin_token.' : ' No admin_token found.'));

        if (storedToken) {
            setToken(storedToken);
            setIsAuthenticated(true);
        }
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch(`https://${import.meta.env.VITE_API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const errorBody = await res.json();
                throw new Error(errorBody.error || 'Login failed');
            }

            const { token } = await res.json();
            if (!token) throw new Error('No token received');

            localStorage.setItem('admin_token', token);
            setToken(token);
            setIsAuthenticated(true);
        } catch (error: any) {
            throw new Error(error.message || 'Login failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('admin_token');
        setToken(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;