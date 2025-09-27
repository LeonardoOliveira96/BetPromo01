import { GraphQLError } from 'graphql';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Context } from '../types/context';

const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não está definido');
  }
  
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as unknown as SignOptions['expiresIn'];
  const options: SignOptions = {
    expiresIn
  };
  
  return jwt.sign({ userId }, secret, options);
};

export const userResolvers = {
  Query: {
    me: async (_: any, __: any, context: Context): Promise<IUser | null> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }
      return context.user;
    },

    users: async (
      _: any,
      { limit = 10, offset = 0 }: { limit?: number; offset?: number },
      context: Context
    ): Promise<IUser[]> => {
      if (!context.user || !['admin', 'manager'].includes(context.user.role)) {
        throw new GraphQLError('Acesso negado', {
          extensions: { code: 'FORBIDDEN' }
        });
      }

      return User.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    },

    user: async (_: any, { id }: { id: string }, context: Context): Promise<IUser | null> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      // Usuários podem ver apenas seu próprio perfil, admins e managers podem ver qualquer um
      if (context.user.role === 'user' && context.user.id !== id) {
        throw new GraphQLError('Acesso negado', {
          extensions: { code: 'FORBIDDEN' }
        });
      }

      return User.findById(id);
    },
  },

  Mutation: {
    login: async (
      _: any,
      { email, password }: { email: string; password: string }
    ): Promise<{ token: string; user: IUser }> => {
      try {
        // Busca o usuário incluindo a senha
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        
        if (!user) {
          throw new GraphQLError('Credenciais inválidas', {
            extensions: { code: 'UNAUTHENTICATED' }
          });
        }

        if (!user.isActive) {
          throw new GraphQLError('Conta desativada', {
            extensions: { code: 'UNAUTHENTICATED' }
          });
        }

        // Verifica a senha
        const isValidPassword = await user.comparePassword(password);
        
        if (!isValidPassword) {
          throw new GraphQLError('Credenciais inválidas', {
            extensions: { code: 'UNAUTHENTICATED' }
          });
        }

        // Atualiza último login
        await user.updateLastLogin();

        // Gera token
        const token = generateToken(user.id);

        // Remove a senha do objeto retornado
        const userWithoutPassword = await User.findById(user.id);

        return {
          token,
          user: userWithoutPassword!,
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new Error(`Erro interno do servidor: ${(error as Error).message}`);
      }
    },

    register: async (
      _: any,
      { input }: { input: { name: string; email: string; password: string; role?: string } }
    ): Promise<{ token: string; user: IUser }> => {
      try {
        const { name, email, password, role = 'user' } = input;

        // Verifica se o email já existe
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          throw new GraphQLError('Email já está em uso', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }

        // Cria o usuário
        const user = new User({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
          role,
        });

        await user.save();

        // Gera token
        const token = generateToken(user.id);

        // Busca o usuário sem a senha
        const userWithoutPassword = await User.findById(user.id);

        return {
          token,
          user: userWithoutPassword!,
        };
      } catch (error: any) {
        if (error.name === 'ValidationError') {
          const messages = Object.values(error.errors).map((err: any) => err.message);
          throw new GraphQLError(messages.join(', '), {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new Error('Erro interno do servidor');
      }
    },

    updateProfile: async (
      _: any,
      { input }: { input: { name?: string; email?: string } },
      context: Context
    ): Promise<IUser> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      try {
        const { name, email } = input;
        const updateData: any = {};

        if (name !== undefined) {
          updateData.name = name.trim();
        }

        if (email !== undefined) {
          // Verifica se o novo email já está em uso
          const existingUser = await User.findOne({ 
            email: email.toLowerCase(),
            _id: { $ne: context.user.id }
          });
          
          if (existingUser) {
            throw new GraphQLError('Email já está em uso', {
              extensions: { code: 'BAD_USER_INPUT' }
            });
          }
          
          updateData.email = email.toLowerCase().trim();
        }

        const updatedUser = await User.findByIdAndUpdate(
          context.user.id,
          updateData,
          { new: true, runValidators: true }
        );

        if (!updatedUser) {
          throw new Error('Usuário não encontrado');
        }

        return updatedUser;
      } catch (error: any) {
        if (error.name === 'ValidationError') {
          const messages = Object.values(error.errors).map((err: any) => err.message);
          throw new GraphQLError(messages.join(', '), {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new Error('Erro interno do servidor');
      }
    },

    changePassword: async (
      _: any,
      { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
      context: Context
    ): Promise<boolean> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      try {
        // Busca o usuário com a senha
        const user = await User.findById(context.user.id).select('+password');
        if (!user) {
          throw new Error('Usuário não encontrado');
        }

        // Verifica a senha atual
        const isValidPassword = await user.comparePassword(currentPassword);
        if (!isValidPassword) {
          throw new GraphQLError('Senha atual incorreta', {
            extensions: { code: 'UNAUTHENTICATED' }
          });
        }

        // Atualiza a senha
        user.password = newPassword;
        await user.save();

        return true;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new Error('Erro interno do servidor');
      }
    },
  },
};