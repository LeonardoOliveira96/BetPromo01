import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Usuário autenticado automaticamente para testes
  const [user, setUser] = useState<User | null>({
    id: 'test-user-id',
    email: 'teste@exemplo.com',
    name: 'Usuário de Teste'
  });
  const [isLoading, setIsLoading] = useState(false);

  // Login automático para testes
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Autenticação automática para testes
      console.log('Login automático ativado para testes');
      
      // Não faz nada, pois o usuário já está autenticado
      // O usuário já está definido no estado inicial
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('betpromo_user');
  };

  // Verificar se existe usuário no localStorage ao inicializar
  React.useEffect(() => {
    const savedUser = localStorage.getItem('betpromo_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('betpromo_user');
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