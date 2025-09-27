import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redireciona para o login se não estiver autenticado
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verifica se há um papel requerido e se o usuário tem esse papel
  if (requiredRole && user?.role !== requiredRole) {
    // Redireciona para a página inicial se não tiver permissão
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;