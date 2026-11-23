import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse } from '../types/api';
import { apiClient } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, username?: string) => Promise<void>;
  requestPasswordReset: (identifier: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
  logout: () => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('eventpulse_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('eventpulse_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUserProfile = async () => {
    const storedToken = localStorage.getItem('eventpulse_token');
    if (storedToken) {
      try {
        const res = await apiClient.get<User>('/auth/me');
        setUser(res.data);
        localStorage.setItem('eventpulse_user', JSON.stringify(res.data));
      } catch (e) {
        console.warn('Session expired or invalid, clearing auth');
        logout();
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      await refreshUserProfile();
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (emailOrUsername: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<AuthResponse>('/auth/login', {
        email: emailOrUsername.trim(),
        password,
      });
      const auth = res.data;
      setToken(auth.token);
      localStorage.setItem('eventpulse_token', auth.token);

      const userObj: User = {
        id: auth.userId,
        email: auth.email,
        username: auth.username,
        fullName: auth.fullName,
        role: auth.role,
      };
      setUser(userObj);
      localStorage.setItem('eventpulse_user', JSON.stringify(userObj));
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<AuthResponse>('/auth/google', { idToken });
      const auth = res.data;
      setToken(auth.token);
      localStorage.setItem('eventpulse_token', auth.token);

      const userObj: User = {
        id: auth.userId,
        email: auth.email,
        username: auth.username,
        fullName: auth.fullName,
        role: auth.role,
      };
      setUser(userObj);
      localStorage.setItem('eventpulse_user', JSON.stringify(userObj));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string, username?: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<AuthResponse>('/auth/register', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        username: username ? username.trim().toLowerCase() : undefined,
        password,
        termsAccepted: true,
      });
      const auth = res.data;
      setToken(auth.token);
      localStorage.setItem('eventpulse_token', auth.token);

      const userObj: User = {
        id: auth.userId,
        email: auth.email,
        username: auth.username,
        fullName: auth.fullName,
        role: auth.role,
      };
      setUser(userObj);
      localStorage.setItem('eventpulse_user', JSON.stringify(userObj));
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (identifier: string): Promise<string> => {
    const res = await apiClient.post<string>('/auth/forgot-password', {
      identifier: identifier.trim(),
    });
    return res.message || 'Password reset instructions have been generated.';
  };

  const resetPassword = async (resetToken: string, newPassword: string): Promise<string> => {
    const res = await apiClient.post<string>('/auth/reset-password', {
      token: resetToken.trim(),
      newPassword,
    });
    return res.message || 'Password reset successfully.';
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('eventpulse_token');
    localStorage.removeItem('eventpulse_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        loginWithGoogle,
        register,
        requestPasswordReset,
        resetPassword,
        logout,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
