import { useState, useEffect, createContext, useContext } from 'react';
import { apiService, User, LoginRequest } from '@/lib/api';
import { AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem('token');
    if (token) {
      apiService.getCurrentUser()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Token is invalid, remove it
          localStorage.removeItem('token');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const credentials: LoginRequest = { email, password };
      const response = await apiService.login(credentials);
      
      if (response.success && response.data) {
        const { token, user: userData } = response.data;
        localStorage.setItem('token', token);
        setUser(userData);
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Login error:', error);
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
    }
  };

  return {
    user,
    login,
    logout,
    isLoading
  };
};

export { AuthContext };