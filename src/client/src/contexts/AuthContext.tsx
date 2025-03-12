import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { JwtResponse, RegisterRequest, MessageResponse } from '../types/auth';
import authService from '../services/authService';

interface AuthContextType {
    user: JwtResponse | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<JwtResponse>;
    register: (registerData: RegisterRequest) => Promise<MessageResponse>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<JwtResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is stored in localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser) as JwtResponse;
                setUser(parsedUser);
            } catch (error) {
                console.error('Failed to parse stored user:', error);
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (username: string, password: string): Promise<JwtResponse> => {
        try {
            setLoading(true);
            const response = await authService.login(username, password);
            setUser(response);
            localStorage.setItem('user', JSON.stringify(response));
            return response;
        } finally {
            setLoading(false);
        }
    }, []);

    const register = useCallback(async (registerData: RegisterRequest): Promise<MessageResponse> => {
        try {
            setLoading(true);
            const response = await authService.register(registerData);
            return response;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            setLoading(true);
            if (user?.username) {
                await authService.logout(user.username);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            localStorage.removeItem('user');
            setLoading(false);
        }
    }, [user]);

    const value = useMemo(() => ({
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
    }), [user, loading, login, register, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
