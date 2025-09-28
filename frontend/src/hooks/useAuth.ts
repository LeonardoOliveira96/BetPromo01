import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../lib/api';
import { TokenStorage } from '../lib/tokenStorage';
import type { User, AuthContextType, TokenInfo } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verifica token na inicialização
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = TokenStorage.getToken();
        
        if (token) {
          // Se há token, tenta validar obtendo dados do usuário
          try {
            const userData = await apiService.getCurrentUser();
            setUser(userData);
          } catch (error) {
            // Token inválido, remove
            TokenStorage.clearToken();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiService.login({ email, password });
      
      if (response.success && response.data) {
        // Armazena o token com expiração de 7 dias
        TokenStorage.setToken(response.data.token, 7);
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      TokenStorage.clearToken();
      setUser(null);
    }
  };

  const getTokenStatus = (): TokenInfo | null => {
    const tokenInfo = TokenStorage.getTokenInfo();
    if (!tokenInfo) return null;

    return {
      expiresAt: tokenInfo.expiresAt,
      refreshAt: tokenInfo.refreshAt,
      daysLeft: tokenInfo.daysLeft
    };
  };

  const extendSession = (days: number = 7): boolean => {
    return TokenStorage.extendToken(days);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    getTokenStatus,
    extendSession,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}