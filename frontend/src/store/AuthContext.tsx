import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';
import { logger } from '../utils/logger';

interface User {
  id: string;
  email: string;
  phone: string;
  role: string;
  balance?: number;
  upi_id?: string;
  total_rewards?: number;
  created_at?: string;
  is_mfa_enabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  wallet: { balance: number; upiId: string } | null;
  login: (identifier: string, password: string, fingerprint: string) => Promise<any>;
  signup: (payload: any) => Promise<any>;
  verifyMfa: (userId: string, code: string, fingerprint: string) => Promise<any>;
  logout: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  updateUpiPin: (payload: any) => Promise<any>;
  addMoneyToWallet: (payload: any) => Promise<any>;
  triggerTransfer: (payload: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<{ balance: number; upiId: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data.data.user;
      
      setUser({
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        is_mfa_enabled: userData.is_mfa_enabled,
        total_rewards: parseFloat(userData.total_rewards || '0.00'),
        created_at: userData.created_at,
      });

      setWallet({
        balance: parseFloat(userData.balance || '0.00'),
        upiId: userData.upi_id || '',
      });
      setIsAuthenticated(true);
    } catch (error) {
      logger.error('Failed to fetch user profile', error);
      // Clean stale tokens if API call failed with auth error
      localStorage.removeItem('accessToken');
      setIsAuthenticated(false);
      setUser(null);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }

    // Capture logout events triggered from Axios response interceptor
    const handleLogoutEvent = () => {
      setIsAuthenticated(false);
      setUser(null);
      setWallet(null);
    };

    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('auth-logout', handleLogoutEvent);
    };
  }, []);

  const login = async (identifier: string, password: string, fingerprint: string) => {
    const response = await api.post('/auth/login', {
      identifier,
      password,
      deviceFingerprint: fingerprint,
    });
    return response.data;
  };

  const signup = async (payload: any) => {
    const response = await api.post('/auth/signup', payload);
    return response.data;
  };

  const verifyMfa = async (userId: string, code: string, fingerprint: string) => {
    const response = await api.post('/auth/verify-mfa', {
      userId,
      code,
      deviceFingerprint: fingerprint,
    });
    
    const { accessToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    
    setIsAuthenticated(true);
    await fetchUserProfile();
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      logger.error('Logout API failed', e);
    } finally {
      localStorage.removeItem('accessToken');
      setIsAuthenticated(false);
      setUser(null);
      setWallet(null);
    }
  };

  const updateUpiPin = async (payload: any) => {
    const response = await api.post('/payment/set-upi-pin', payload);
    return response.data;
  };

  const addMoneyToWallet = async (payload: any) => {
    const response = await api.post('/payment/wallet/add', payload);
    await fetchUserProfile(); // Refresh balances
    return response.data;
  };

  const triggerTransfer = async (payload: any) => {
    const response = await api.post('/payment/transfer', payload);
    if (response.data?.status === 'success') {
      await fetchUserProfile(); // Refresh balances
    }
    return response.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        wallet,
        login,
        signup,
        verifyMfa,
        logout,
        fetchUserProfile,
        updateUpiPin,
        addMoneyToWallet,
        triggerTransfer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
