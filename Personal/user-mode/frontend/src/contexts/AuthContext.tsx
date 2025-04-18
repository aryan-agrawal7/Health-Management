import React, { createContext, useContext, useState, ReactNode } from 'react';
import axios from 'axios';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  getAuthAxios: () => any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    localStorage.getItem('token') ? true : false
  );

  // Get the base URL for API requests
  const getBaseUrl = () => {
    // Check if running in development or production
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:5000';
    } else {
      // In production, use relative URLs which will automatically
      // use the same host as the frontend
      return '';
    }
  };
  
  // Get API base URL
  const baseUrl = getBaseUrl();

  const getAuthAxios = () => {
    const token = localStorage.getItem('token');
    return axios.create({
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      baseURL: baseUrl,
    });
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${baseUrl}/api/auth/login`, {
        email,
        password
      });
      localStorage.setItem('token', response.data.token);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      await axios.post(`${baseUrl}/api/auth/register`, {
        email,
        password,
        name
      });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, register, getAuthAxios }}>
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