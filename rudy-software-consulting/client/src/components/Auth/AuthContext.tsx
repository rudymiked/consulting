import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    login: async () => { },
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch(`https://${import.meta.env.VITE_API_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const errorBody = await res.json();
                throw new Error(errorBody.error || 'Login failed');
            }

            console.log(res);

            const { token } = await res.json();

            if (!token) throw new Error('No token received');

            localStorage.setItem('admin_token', token);
            setIsAuthenticated(true);
        } catch (error: any) {
            throw new Error(error.message || 'Login failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('admin_token');
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;