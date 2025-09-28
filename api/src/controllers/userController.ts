import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { validateConsultaQuery } from '../schemas/validation';
import { ConsultaResponseDTO, UserFilters } from '../types';
import { AppError } from '../middlewares/errorHandler';

/**
 * Controller de usuários
 * Gerencia endpoints relacionados à consulta de usuários e promoções
 */
export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * GET /consulta
   * Retorna dados da tabela usuarios_final com promoções vigentes
   * @param req - Request com parâmetros de consulta
   * @param res - Response com dados dos usuários
   */
  consulta = async (req: Request, res: Response): Promise<void> => {
    try {
      // Valida parâmetros de consulta
      const queryParams = validateConsultaQuery(req.query);

      // Busca dados usando o método correto do service
      const result = await this.userService.consultarUsuarios(queryParams);

      res.status(200).json(result);

    } catch (error) {
      console.error('Erro na consulta:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.errorCode || 'APP_ERROR',
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
   * GET /consulta/:id
   * Retorna dados de um usuário específico
   * @param req - Request com ID do usuário
   * @param res - Response com dados do usuário
   */
  consultaById = async (req: Request, res: Response): Promise<void> => {
    try {
      const smartico_user_id = parseInt(req.params.id ?? '');

      if (isNaN(smartico_user_id)) {
        throw new AppError('ID do usuário inválido', 400, 'INVALID_USER_ID');
      }

      // Busca usuário específico
      const user = await this.userService.buscarUsuarioPorId(smartico_user_id);

      if (!user) {
        throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: user,
        message: 'Usuário encontrado com sucesso'
      });

    } catch (error) {
      console.error('Erro na consulta por ID:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.errorCode || 'APP_ERROR',
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
   * GET /consulta/:id/historico
   * Retorna histórico de promoções de um usuário
   * @param req - Request com ID do usuário
   * @param res - Response com histórico
   */
  historicoById = async (req: Request, res: Response): Promise<void> => {
    try {
      const smartico_user_id = parseInt(req.params.id ?? '');

      if (isNaN(smartico_user_id)) {
        throw new AppError('ID do usuário inválido', 400, 'INVALID_USER_ID');
      }

      // Busca histórico do usuário
      const historico = await this.userService.getUserPromotionHistory(smartico_user_id);

      res.status(200).json({
        success: true,
        data: {
          smartico_user_id,
          historico,
          total: historico.length
        },
        message: `${historico.length} registros de histórico encontrados`
      });

    } catch (error) {
      console.error('Erro na consulta de histórico:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.errorCode || 'APP_ERROR',
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
   * GET /stats
   * Retorna estatísticas gerais do sistema
   * @param req - Request
   * @param res - Response com estatísticas
   */
  stats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Busca estatísticas do sistema
      const stats = await this.userService.getSystemStats();

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Estatísticas obtidas com sucesso'
      });

    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.errorCode || 'APP_ERROR',
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
   * GET /brands
   * Retorna lista de marcas com usuários
   * @param req - Request
   * @param res - Response com marcas
   */
  brands = async (req: Request, res: Response): Promise<void> => {
    try {
      // Busca marcas
      const brands = await this.userService.getUsersByBrand();

      res.status(200).json({
        success: true,
        data: brands,
        message: `${brands.length} marcas encontradas`
      });

    } catch (error) {
      console.error('Erro ao obter marcas:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.errorCode || 'APP_ERROR',
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
   * GET /:id/promotions
   * Busca promoções detalhadas de um usuário
   * @param req - Request com smartico_user_id
   * @param res - Response com promoções do usuário
   */
  getUserPromotions = async (req: Request, res: Response): Promise<void> => {
    try {
      const smarticoUserId = parseInt(req.params.id ?? '');

      if (!smarticoUserId || isNaN(smarticoUserId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_ID',
            message: 'ID do usuário inválido'
          }
        });
        return;
      }

      const promotionsData = await this.userService.getUserPromotionsDetailed(smarticoUserId);

      res.status(200).json({
        success: true,
        data: promotionsData,
        message: 'Promoções do usuário obtidas com sucesso'
      });

    } catch (error) {
      console.error('Erro ao buscar promoções do usuário:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  };

  /**
   * GET /health
   * Verifica saúde do serviço de usuários
   * @param req - Request
   * @param res - Response com status
   */
  health = async (req: Request, res: Response): Promise<void> => {
    try {
      // Testa conexão com banco
      const isHealthy = await this.userService.checkHealth();

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: {
          service: 'users',
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString()
        },
        message: isHealthy ? 'Serviço funcionando corretamente' : 'Serviço com problemas'
      });

    } catch (error) {
      console.error('Erro no health check:', error);
      res.status(503).json({
        success: false,
        data: {
          service: 'users',
          status: 'unhealthy',
          timestamp: new Date().toISOString()
        },
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Erro ao verificar saúde do serviço'
        }
      });
    }
  };
}