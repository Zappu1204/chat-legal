import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
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
    const refreshTimerRef = useRef<number | null>(null);

    // Function to refresh the token session
    const refreshSession = useCallback(async (): Promise<JwtResponse | null> => {
        try {
            // Stop any existing refresh timers
            if (refreshTimerRef.current) {
                window.clearTimeout(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }

            const userStr = localStorage.getItem('user');
            if (!userStr) return null;
            
            const userData = JSON.parse(userStr) as JwtResponse;
            
            if (!userData.refreshToken) return null;
            
            // Check if access token is still valid with some margin (60 seconds)
            if (userData.accessToken && 
                !authService.isTokenExpired(userData.accessToken) && 
                authService.getTokenRemainingTime(userData.accessToken) > 60) {
                // Schedule refresh before token expires
                scheduleTokenRefresh(userData.accessToken);
                setUser(userData);
                return userData;
            }
            
            // If we're here, we need to refresh the token
            const response = await authService.refreshToken(userData.refreshToken);
            
            // Update in localStorage
            const updatedUser = { ...userData, ...response };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            // Schedule the next refresh
            scheduleTokenRefresh(response.accessToken);
            
            return updatedUser;
        } catch (error) {
            console.error('Error refreshing session:', error);
            logout();
            return null;
        }
    }, []);
    
    // Schedule token refresh before expiration
    const scheduleTokenRefresh = useCallback((token: string) => {
        if (refreshTimerRef.current) {
            window.clearTimeout(refreshTimerRef.current);
        }
        
        // Get token remaining time in seconds
        const remainingTimeInSeconds = authService.getTokenRemainingTime(token);
        
        // Refresh at 80% of the token lifetime to ensure we have a valid token at all times
        const refreshDelay = Math.max(10, remainingTimeInSeconds * 0.8) * 1000;
        
        console.log(`Token refresh scheduled in ${Math.round(refreshDelay / 1000)} seconds`);
        
        refreshTimerRef.current = window.setTimeout(() => {
            refreshSession();
        }, refreshDelay);
    }, [refreshSession]);

    useEffect(() => {
        // On initial load, check if we have a stored user and refresh the session
        const initializeAuth = async () => {
            setLoading(true);
            try {
                await refreshSession();
            } catch (error) {
                console.error('Error initializing auth:', error);
                localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };
        
        initializeAuth();
        
        // Cleanup function to clear any pending timeouts
        return () => {
            if (refreshTimerRef.current) {
                window.clearTimeout(refreshTimerRef.current);
            }
        };
    }, [refreshSession]);

    const login = useCallback(async (username: string, password: string): Promise<JwtResponse> => {
        try {
            setLoading(true);
            const response = await authService.login(username, password);
            
            setUser(response);
            localStorage.setItem('user', JSON.stringify(response));
            
            // Set up token refresh
            scheduleTokenRefresh(response.accessToken);
            
            return response;
        } finally {
            setLoading(false);
        }
    }, [scheduleTokenRefresh]);

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
            // Clear refresh timer
            if (refreshTimerRef.current) {
                window.clearTimeout(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
            
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
