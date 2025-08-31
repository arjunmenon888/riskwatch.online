import React, { createContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import apiClient from '../api/apiClient.ts';

export type UserRole = 'superadmin' | 'admin' | 'user';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
  full_name: string | null;
  company_name: string | null;
  can_create_users: boolean;
  user_creation_limit: number;
  created_at?: string; // Optional because it might not be present on all user objects
  last_login?: string | null;
  status_locked: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (accessToken: string, refreshToken: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const { data } = await apiClient.get<User>('/users/me');
      setUser(data);
    } catch (error) {
      console.error('Failed to fetch current user, logging out.', error);
      logout();
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (token) {
      const decoded: { exp: number } = jwtDecode(token);
      if (decoded.exp * 1000 > Date.now()) {
        fetchCurrentUser().finally(() => setIsLoading(false));
      } else {
        logout();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData); // Set user data directly from the login response
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{!isLoading && children}</AuthContext.Provider>;
};