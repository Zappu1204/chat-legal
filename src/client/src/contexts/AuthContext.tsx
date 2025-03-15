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
    refreshSession: () => Promise<JwtResponse | null>;
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

    // Function to get user from storage - used in multiple places
    const getUserFromStorage = useCallback(() => {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) as JwtResponse : null;
        } catch (e) {
            console.error('Failed to parse stored user:', e);
            localStorage.removeItem('user');
            return null;
        }
    }, []);

    // Function to refresh the token session - only when explicitly needed
    const refreshSession = useCallback(async (): Promise<JwtResponse | null> => {
        try {
            // Get user data from storage
            const userData = getUserFromStorage();
            if (!userData?.refreshToken) {
                return null;
            }

            // Only refresh if there's a refresh token available
            const response = await authService.refreshToken(userData.refreshToken);
            
            // Update localStorage with new tokens
            const updatedUser = {
                ...userData,
                accessToken: response.accessToken,
                refreshToken: response.refreshToken
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            return updatedUser;
        } catch (error) {
            console.error('Error refreshing session:', error);
            // Clear user data on refresh failure
            setUser(null);
            localStorage.removeItem('user');
            return null;
        }
    }, [getUserFromStorage]);

    // On initial load, check if we have a stored user
    useEffect(() => {
        const initializeAuth = async () => {
            setLoading(true);
            try {
                // Simply get user from storage - no auto refresh here
                // The API interceptor will handle token refreshing when needed
                const userData = getUserFromStorage();
                
                // If userData exists, set the user state
                if (userData) {
                    setUser(userData);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };
        
        initializeAuth();
    }, [getUserFromStorage]);

    const login = useCallback(async (username: string, password: string): Promise<JwtResponse> => {
        try {
            setLoading(true);
            const response = await authService.login(username, password);
            
            // Store user data
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
            // Clear user data
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
        refreshSession,
        isAuthenticated: !!user,
    }), [user, loading, login, register, logout, refreshSession]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
