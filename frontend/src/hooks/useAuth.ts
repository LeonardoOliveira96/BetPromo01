import { useState, useEffect, createContext, useContext } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import { User, AuthContextType, LoginResponse } from '@/types';
import { LOGIN_MUTATION, GET_CURRENT_USER } from '@/lib/queries';

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
  
  const [loginMutation] = useMutation<{ login: LoginResponse }>(LOGIN_MUTATION);
  const [getCurrentUser] = useLazyQuery<{ me: User }>(GET_CURRENT_USER);

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem('token');
    if (token) {
      getCurrentUser()
        .then(({ data }) => {
          if (data?.me) {
            setUser(data.me);
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('token');
          }
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
  }, [getCurrentUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { data } = await loginMutation({
        variables: { email, password }
      });
      
      if (data?.login) {
        const { token, user: userData } = data.login;
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return {
    user,
    login,
    logout,
    isLoading
  };
};

export { AuthContext };