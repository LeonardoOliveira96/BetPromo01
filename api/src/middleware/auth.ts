import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import { User, IUser } from '../models/User';
import { Context } from '../types/context';

export interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

export const createContext = async ({ req }: { req: any }): Promise<Context> => {
  const context: Context = {};

  // Extrai o token do header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    
    try {
      // Verifica e decodifica o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JWTPayload;
      
      // Busca o usuário no banco de dados
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        context.user = user;
        context.token = token;
      }
    } catch (error) {
      // Token inválido ou expirado - não faz nada, deixa context.user como undefined
    }
  }

  return context;
};

export const requireAuth = (context: Context): IUser => {
  if (!context.user) {
    throw new GraphQLError('Você deve estar logado para acessar este recurso', {
      extensions: { code: 'UNAUTHENTICATED' }
    });
  }
  return context.user;
};

export const requireRole = (context: Context, allowedRoles: string[]): IUser => {
  const user = requireAuth(context);
  
  if (!allowedRoles.includes(user.role)) {
    throw new GraphQLError('Você não tem permissão para acessar este recurso', {
      extensions: { code: 'FORBIDDEN' }
    });
  }
  
  return user;
};