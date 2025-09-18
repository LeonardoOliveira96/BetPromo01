import { GraphQLError } from 'graphql';
import { Promotion, IPromotion } from '../models/Promotion';
import { User } from '../models/User';
import { Context } from '../types/context';

export const promotionResolvers = {
  Query: {
    promotions: async (
      _: any,
      { 
        limit = 10, 
        offset = 0, 
        isActive, 
        type, 
        startDate, 
        endDate 
      }: { 
        limit?: number; 
        offset?: number; 
        isActive?: boolean; 
        type?: string; 
        startDate?: Date; 
        endDate?: Date; 
      },
      context: Context
    ): Promise<IPromotion[]> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const filter: any = {};

      if (isActive !== undefined) {
        filter.isActive = isActive;
      }

      if (type) {
        filter.type = type.toLowerCase();
      }

      if (startDate || endDate) {
        filter.startDate = {};
        if (startDate) filter.startDate.$gte = startDate;
        if (endDate) filter.startDate.$lte = endDate;
      }

      return Promotion.find(filter)
        .populate('createdBy', 'name email')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit)
        .skip(offset);
    },

    promotion: async (_: any, { id }: { id: string }, context: Context): Promise<IPromotion | null> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      return Promotion.findById(id).populate('createdBy', 'name email');
    },

    activePromotions: async (_: any, __: any, context: Context): Promise<IPromotion[]> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const now = new Date();
      return Promotion.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
        .populate('createdBy', 'name email')
        .sort({ priority: -1, createdAt: -1 });
    },

    promotionsByUser: async (_: any, { userId }: { userId: string }, context: Context): Promise<IPromotion[]> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      // Apenas admins, managers ou o próprio usuário podem ver suas promoções
      if (context.user.role === 'user' && context.user.id !== userId) {
        throw new GraphQLError('Acesso negado', {
          extensions: { code: 'FORBIDDEN' }
        });
      }

      return Promotion.find({ createdBy: userId })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    },
  },

  Mutation: {
    createPromotion: async (
      _: any,
      { input }: { input: any },
      context: Context
    ): Promise<IPromotion> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      if (!['admin', 'manager'].includes(context.user.role)) {
        throw new GraphQLError('Apenas administradores e gerentes podem criar promoções', {
          extensions: { code: 'FORBIDDEN' }
        });
      }

      try {
        const promotion = new Promotion({
          ...input,
          createdBy: context.user.id,
        });

        await promotion.save();
        return promotion.populate('createdBy', 'name email');
      } catch (error: any) {
        if (error.name === 'ValidationError') {
          const messages = Object.values(error.errors).map((err: any) => err.message);
          throw new GraphQLError(messages.join(', '), {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }
        throw new Error('Erro interno do servidor');
      }
    },

    updatePromotion: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: Context
    ): Promise<IPromotion> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      if (!['admin', 'manager'].includes(context.user.role)) {
        throw new GraphQLError('Apenas administradores e gerentes podem editar promoções', {
          extensions: { code: 'FORBIDDEN' }
        });
      }

      try {
        const promotion = await Promotion.findById(id);
        if (!promotion) {
          throw new GraphQLError('Promoção não encontrada', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }

        // Managers só podem editar suas próprias promoções, admins podem editar qualquer uma
        if (context.user.role === 'manager' && promotion.createdBy.toString() !== context.user.id) {
          throw new GraphQLError('Você só pode editar suas próprias promoções', {
            extensions: { code: 'FORBIDDEN' }
          });
        }

        const updatedPromotion = await Promotion.findByIdAndUpdate(
          id,
          input,
          { new: true, runValidators: true }
        ).populate('createdBy', 'name email');

        if (!updatedPromotion) {
          throw new Error('Erro ao atualizar promoção');
        }

        return updatedPromotion;
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

    deletePromotion: async (_: any, { id }: { id: string }, context: Context): Promise<boolean> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      if (!['admin', 'manager'].includes(context.user.role)) {
        throw new GraphQLError('Apenas administradores e gerentes podem deletar promoções', {
          extensions: { code: 'FORBIDDEN' }
        });
      }

      try {
        const promotion = await Promotion.findById(id);
        if (!promotion) {
          throw new GraphQLError('Promoção não encontrada', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }

        // Managers só podem deletar suas próprias promoções, admins podem deletar qualquer uma
        if (context.user.role === 'manager' && promotion.createdBy.toString() !== context.user.id) {
          throw new GraphQLError('Você só pode deletar suas próprias promoções', {
            extensions: { code: 'FORBIDDEN' }
          });
        }

        await Promotion.findByIdAndDelete(id);
        return true;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new Error('Erro interno do servidor');
      }
    },

    activatePromotion: async (_: any, { id }: { id: string }, context: Context): Promise<IPromotion> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      if (!['admin', 'manager'].includes(context.user.role)) {
        throw new GraphQLError('Apenas administradores e gerentes podem ativar promoções', {
          extensions: { code: 'FORBIDDEN' }
        });
      }

      try {
        const promotion = await Promotion.findById(id);
        if (!promotion) {
          throw new GraphQLError('Promoção não encontrada', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }

        // Managers só podem ativar suas próprias promoções, admins podem ativar qualquer uma
        if (context.user.role === 'manager' && promotion.createdBy.toString() !== context.user.id) {
          throw new GraphQLError('Você só pode ativar suas próprias promoções', {
            extensions: { code: 'FORBIDDEN' }
          });
        }

        const updatedPromotion = await Promotion.findByIdAndUpdate(
          id,
          { isActive: true },
          { new: true }
        ).populate('createdBy', 'name email');

        if (!updatedPromotion) {
          throw new Error('Erro ao ativar promoção');
        }

        return updatedPromotion;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new Error('Erro interno do servidor');
      }
    },

    deactivatePromotion: async (_: any, { id }: { id: string }, context: Context): Promise<IPromotion> => {
      if (!context.user) {
        throw new GraphQLError('Você deve estar logado para acessar este recurso', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      if (!['admin', 'manager'].includes(context.user.role)) {
        throw new GraphQLError('Apenas administradores e gerentes podem desativar promoções', {
          extensions: { code: 'FORBIDDEN' }
        });
      }

      try {
        const promotion = await Promotion.findById(id);
        if (!promotion) {
          throw new GraphQLError('Promoção não encontrada', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }

        // Managers só podem desativar suas próprias promoções, admins podem desativar qualquer uma
        if (context.user.role === 'manager' && promotion.createdBy.toString() !== context.user.id) {
          throw new GraphQLError('Você só pode desativar suas próprias promoções', {
            extensions: { code: 'FORBIDDEN' }
          });
        }

        const updatedPromotion = await Promotion.findByIdAndUpdate(
          id,
          { isActive: false },
          { new: true }
        ).populate('createdBy', 'name email');

        if (!updatedPromotion) {
          throw new Error('Erro ao desativar promoção');
        }

        return updatedPromotion;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new Error('Erro interno do servidor');
      }
    },
  },

  Promotion: {
    createdBy: async (promotion: IPromotion) => {
      return User.findById(promotion.createdBy);
    },
  },
};