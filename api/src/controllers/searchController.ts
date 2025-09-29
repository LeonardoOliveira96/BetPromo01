import { Request, Response } from 'express';
import { SearchService } from '../services/searchService';
import { AppError } from '../middlewares/errorHandler';

/**
 * Controller de busca otimizada
 * Gerencia endpoints de busca rápida de usuários
 */
export class SearchController {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  /**
   * GET /search/users
   * Busca usuários por smartico_user_id ou user_ext_id
   */
  searchUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, type = 'both', page = 1, limit = 20 } = req.query;

      // Validação dos parâmetros
      if (!query || typeof query !== 'string' || !query.trim()) {
        throw new AppError('Parâmetro query é obrigatório', 400, 'MISSING_QUERY');
      }

      const searchQuery = query.trim();
      const searchType = type as 'smartico_user_id' | 'user_ext_id' | 'both';
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);

      // Validação do tipo de busca
      if (!['smartico_user_id', 'user_ext_id', 'both'].includes(searchType)) {
        throw new AppError('Tipo de busca inválido', 400, 'INVALID_SEARCH_TYPE');
      }

      // Busca usuários
      const result = await this.searchService.searchUsers({
        query: searchQuery,
        type: searchType,
        page: pageNum,
        limit: limitNum
      });

      res.status(200).json({
        success: true,
        data: result,
        message: `${result.users.length} usuário(s) encontrado(s)`
      });

    } catch (error) {
      console.error('Erro na busca de usuários:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          }
        });
      }
    }
  };

  /**
   * GET /search/users/:id
   * Busca usuário por ID específico
   */
  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { type = 'smartico_user_id' } = req.query;

      // Validação dos parâmetros
      if (!id || !id.trim()) {
        throw new AppError('ID do usuário é obrigatório', 400, 'MISSING_USER_ID');
      }

      const searchType = type as string;

      // Validação do tipo de busca
      if (!['smartico_user_id', 'user_ext_id'].includes(searchType)) {
        throw new AppError('Tipo de busca inválido', 400, 'INVALID_SEARCH_TYPE');
      }

      // Buscar usuário por ID
      const user = await this.searchService.getUserById(id.trim(), searchType);

      res.status(200).json({
        success: true,
        data: user,
        message: 'Usuário encontrado'
      });

    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          }
        });
      }
    }
  };

  /**
   * GET /search/quick
   * Busca rápida para autocomplete
   */
  quickSearch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query } = req.query;

      // Validação dos parâmetros
      if (!query || typeof query !== 'string' || !query.trim()) {
        res.status(200).json({
          success: true,
          data: []
        });
        return;
      }

      const searchQuery = query.trim();

      // Busca rápida limitada
      const suggestions = await this.searchService.quickSearch(searchQuery);

      res.status(200).json({
        success: true,
        data: suggestions
      });

    } catch (error) {
      console.error('Erro na busca rápida:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          }
        });
      }
    }
  };
}