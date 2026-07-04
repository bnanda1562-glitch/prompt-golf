import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api.js';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  rating: number;
  wins: number;
  gamesPlayed: number;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('prompt_golf_token');
      const savedUser = localStorage.getItem('prompt_golf_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Refresh user profile in background
          const response = await api.get('/auth/profile');
          setUser(response.data.user);
          localStorage.setItem('prompt_golf_user', JSON.stringify(response.data.user));
        } catch (error) {
          console.error('Failed to sync profile on boot:', error);
          // Token expired or invalid, api interceptor handles removal
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user: loggedUser } = response.data;
    
    localStorage.setItem('prompt_golf_token', token);
    localStorage.setItem('prompt_golf_user', JSON.stringify(loggedUser));
    setUser(loggedUser);
  };

  const signup = async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    const { token, user: newUser } = response.data;

    localStorage.setItem('prompt_golf_token', token);
    localStorage.setItem('prompt_golf_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('prompt_golf_token');
    localStorage.removeItem('prompt_golf_user');
    setUser(null);
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('prompt_golf_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
