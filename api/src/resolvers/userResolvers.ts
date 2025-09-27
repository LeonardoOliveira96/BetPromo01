import { GraphQLError } from 'graphql';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Context } from '../types/context';

console.log('📋 [RESOLVER] UserResolvers carregado');

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
    me: async (_: any, __: any, context: any): Promise<IUser> => {
      console.log('🔍 [ME] Query me executada');
      if (!context.user) {
        console.log('❌ [ME] Usuário não autenticado');
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      console.log('✅ [ME] Usuário autenticado:', { id: context.user.id, email: context.user.email });
      const user = await User.findById(context.user.id);
      if (!user) {
        throw new GraphQLError('Usuário não encontrado', {
          extensions: { code: 'NOT_FOUND' }
        });
      }
      return user;
    },

    users: async (_: any, __: any, context: any): Promise<IUser[]> => {
      console.log('🔍 [USERS] Query users executada');
      if (!context.user) {
        console.log('❌ [USERS] Usuário não autenticado');
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      console.log('🔍 [USERS] Usuário autenticado:', { id: context.user.id, role: context.user.role });

      // Apenas admins e managers podem listar usuários
      if (!['admin', 'manager'].includes(context.user.role)) {
        console.log('❌ [USERS] Acesso negado para role:', context.user.role);
        throw new GraphQLError('Acesso negado', {
          extensions: { code: 'FORBIDDEN' }
        });
      }

      console.log('✅ [USERS] Listando usuários...');
      return User.find({});
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
        console.log('🔍 [LOGIN] Tentativa de login recebida:', { email, password: '***' });
        
        // Busca o usuário incluindo a senha
        console.log('🔍 [LOGIN] Buscando usuário no banco de dados...');
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        console.log('🔍 [LOGIN] Resultado da busca:', user ? 'Usuário encontrado' : 'Usuário não encontrado');
        
        if (!user) {
          console.log('❌ [LOGIN] Usuário não encontrado para email:', email);
          throw new GraphQLError('Credenciais inválidas', {
            extensions: { code: 'UNAUTHENTICATED' }
          });
        }

        console.log('✅ [LOGIN] Usuário encontrado:', { id: user.id, email: user.email, role: user.role });

        if (!user.isActive) {
          console.log('❌ [LOGIN] Conta desativada para usuário:', user.email);
          throw new GraphQLError('Conta desativada', {
            extensions: { code: 'UNAUTHENTICATED' }
          });
        }

        // Verifica a senha
        console.log('🔍 [LOGIN] Verificando senha...');
        const isValidPassword = await user.comparePassword(password);
        console.log('🔍 [LOGIN] Senha válida:', isValidPassword);
        
        if (!isValidPassword) {
          console.log('❌ [LOGIN] Senha inválida para usuário:', user.email);
          throw new GraphQLError('Credenciais inválidas', {
            extensions: { code: 'UNAUTHENTICATED' }
          });
        }

        // Atualiza último login
        console.log('🔍 [LOGIN] Atualizando último login...');
        await user.updateLastLogin();

        // Gera token
        console.log('🔍 [LOGIN] Gerando token...');
        const token = generateToken(user.id);

        // Remove a senha do objeto retornado
        const userWithoutPassword = await User.findById(user.id);

        console.log('✅ [LOGIN] Login realizado com sucesso para:', user.email);
        return {
          token,
          user: userWithoutPassword!,
        };
      } catch (error) {
        console.log('❌ [LOGIN] Erro durante o login:', error);
        if (error instanceof GraphQLError) {
          throw error;
        }
        console.log('❌ [LOGIN] Erro interno do servidor:', (error as Error).message);
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