import { useEffect } from 'react';
import { TokenStorage } from '../../lib/tokenStorage';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  useEffect(() => {
    const initializeAuth = () => {
      try {
        // Apenas verifica se o token precisa ser renovado
        if (TokenStorage.shouldRefresh()) {
          console.log('Token próximo do vencimento, estendendo sessão...');
          TokenStorage.extendToken(7); // Estende por mais 7 dias
        }
      } catch (error) {
        console.error('Erro na inicialização da autenticação:', error);
      }
    };

    initializeAuth();
  }, []); // Executa apenas uma vez na inicialização

  return <>{children}</>;
};