import React, { createContext, useState, ReactNode, useEffect } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import type { DefaultContext, OperationVariables } from '@apollo/client/core';
import { apolloClient } from '@/lib/apollo-client';
import { LOGIN } from '@/lib/graphql/authQueries';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface LoginResponse {
  login: {
    token: string;
    user: User;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [loginMutation] = useMutation<LoginResponse>(LOGIN, {
    client: apolloClient
  });

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);

    try {
      const { data } = await loginMutation({
        variables: { email, password }
      });

      if (data && data.login) {
        const { token, user } = data.login;

        // Salvar token e usuário no localStorage
        localStorage.setItem('betpromo_token', token);
        localStorage.setItem('betpromo_user', JSON.stringify(user));

        setUser(user);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('betpromo_token');
    localStorage.removeItem('betpromo_user');
    apolloClient.resetStore();
  };

  // Verificar se existe usuário no localStorage ao inicializar
  useEffect(() => {
    const savedUser = localStorage.getItem('betpromo_user');
    const token = localStorage.getItem('betpromo_token');

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('betpromo_user');
        localStorage.removeItem('betpromo_token');
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook movido para /hooks/use-auth.ts