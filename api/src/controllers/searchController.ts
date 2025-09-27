import { Request, Response } from 'express';
import { PromotionUser } from '../models/PromotionUser';

export class SearchController {
  /**
   * Busca usuários por smartico_user_id ou user_ext_id
   * Suporta busca exata e busca parcial (para user_ext_id)
   */
  static async searchUsers(req: Request, res: Response) {
    try {
      const { query, type, limit = 50, page = 1 } = req.query;

      // Validação dos parâmetros
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Parâmetro "query" é obrigatório e deve ser uma string'
        });
      }

      if (!type || !['smartico_user_id', 'user_ext_id', 'both'].includes(type as string)) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetro "type" deve ser "smartico_user_id", "user_ext_id" ou "both"'
        });
      }

      const limitNum = Math.min(parseInt(limit as string) || 50, 100); // Máximo 100 resultados
      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const skip = (pageNum - 1) * limitNum;

      let searchConditions: any = {};

      // Construir condições de busca baseadas no tipo
      if (type === 'smartico_user_id') {
        // Para smartico_user_id, busca exata (número)
        const numericQuery = parseInt(query as string);
        if (isNaN(numericQuery)) {
          return res.status(400).json({
            success: false,
            message: 'Para busca por smartico_user_id, a query deve ser um número válido'
          });
        }
        searchConditions.smartico_user_id = numericQuery;
      } else if (type === 'user_ext_id') {
        // Para user_ext_id, busca parcial (case-insensitive)
        searchConditions.user_ext_id = {
          $regex: query as string,
          $options: 'i'
        };
      } else if (type === 'both') {
        // Busca em ambos os campos
        const numericQuery = parseInt(query as string);
        const conditions: any[] = [];
        
        // Se a query é um número válido, inclui busca por smartico_user_id
        if (!isNaN(numericQuery)) {
          conditions.push({ smartico_user_id: numericQuery });
        }
        
        // Sempre inclui busca por user_ext_id
        conditions.push({
          user_ext_id: {
            $regex: query as string,
            $options: 'i'
          }
        });

        searchConditions.$or = conditions;
      }

      // Executar busca com paginação
      const [users, totalCount] = await Promise.all([
        PromotionUser.find(searchConditions)
          .select('smartico_user_id user_ext_id core_sm_brand_id crm_brand_id ext_brand_id crm_brand_name current_promotions created_at updated_at')
          .sort({ updated_at: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        PromotionUser.countDocuments(searchConditions)
      ]);

      // Calcular informações de paginação
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      return res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalCount,
            limit: limitNum,
            hasNextPage,
            hasPrevPage
          }
        },
        message: `Encontrados ${users.length} usuários de ${totalCount} total`
      });

    } catch (error) {
      console.error('Erro na busca de usuários:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar usuários',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  /**
   * Busca detalhada de um usuário específico por ID
   */
  static async getUserDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { type = 'smartico_user_id' } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID é obrigatório'
        });
      }

      let searchCondition: any = {};

      if (type === 'smartico_user_id') {
        const numericId = parseInt(id);
        if (isNaN(numericId)) {
          return res.status(400).json({
            success: false,
            message: 'Para busca por smartico_user_id, o ID deve ser um número válido'
          });
        }
        searchCondition.smartico_user_id = numericId;
      } else if (type === 'user_ext_id') {
        searchCondition.user_ext_id = id;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Tipo de busca deve ser "smartico_user_id" ou "user_ext_id"'
        });
      }

      const user = await PromotionUser.findOne(searchCondition).lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
        message: 'Usuário encontrado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao buscar detalhes do usuário:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar detalhes do usuário',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  /**
   * Busca rápida para autocomplete
   */
  static async quickSearch(req: Request, res: Response) {
    try {
      const { query } = req.query;

      if (!query || typeof query !== 'string' || (query as string).length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Query deve ter pelo menos 2 caracteres'
        });
      }

      const searchQuery = query as string;
      const numericQuery = parseInt(searchQuery);
      
      const conditions: any[] = [];
      
      // Se é um número, busca por smartico_user_id
      if (!isNaN(numericQuery)) {
        conditions.push({ smartico_user_id: numericQuery });
      }
      
      // Sempre busca por user_ext_id (parcial)
      conditions.push({
        user_ext_id: {
          $regex: `^${searchQuery}`,
          $options: 'i'
        }
      });

      const users = await PromotionUser.find({ $or: conditions })
        .select('smartico_user_id user_ext_id crm_brand_name')
        .limit(10)
        .lean();

      return res.status(200).json({
        success: true,
        data: users,
        message: `${users.length} sugestões encontradas`
      });

    } catch (error) {
      console.error('Erro na busca rápida:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor na busca rápida',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
}