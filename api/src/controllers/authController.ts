import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { validateLogin } from '../schemas/validation';
import { LoginRequestDTO, LoginResponseDTO } from '../types';
import { AppError } from '../middlewares/errorHandler';

/**
 * Controller de autenticação
 * Gerencia endpoints relacionados à autenticação de usuários
 */
export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /login
   * Autentica usuário e retorna JWT token
   * @param req - Request com email e senha
   * @param res - Response com token JWT
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      // Valida dados de entrada
      const loginData: LoginRequestDTO = validateLogin(req.body);

      // Autentica usuário
      const result = await this.authService.login(loginData);

      // Verifica se o login foi bem-sucedido
      if (!result.success) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: result.message || 'Credenciais inválidas'
          }
        });
        return;
      }

      // Prepara resposta de sucesso
      res.status(200).json({
        success: true,
        data: {
          token: result.token,
          user: result.user
        },
        message: result.message
      });

    } catch (error) {
      console.error('Erro no login:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: (error as any).code,
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
   * POST /logout
   * Invalida token JWT (implementação futura com blacklist)
   * @param req - Request com token
   * @param res - Response de confirmação
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      // Por enquanto, apenas retorna sucesso
      // Em implementação futura, adicionar token à blacklist
      res.status(200).json({
        success: true,
        message: 'Logout realizado com sucesso'
      });

    } catch (error) {
      console.error('Erro no logout:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  };

  /**
   * GET /me
   * Retorna informações do usuário autenticado
   * @param req - Request com usuário autenticado
   * @param res - Response com dados do usuário
   */
  me = async (req: Request, res: Response): Promise<void> => {
    try {
      // O middleware de autenticação já validou o token e adicionou o usuário ao req
      const userFromToken = (req as any).user;
      const userId = userFromToken?.userId;

      if (!userId) {
        throw new AppError('Usuário não encontrado', 401, 'USER_NOT_FOUND');
      }

      // Busca dados atualizados do usuário
      const user = await this.authService.getUserById(userId);

      if (!user) {
        throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: (user as any).role,
          isActive: user.is_active,
          createdAt: user.created_at,
          lastLogin: (user as any).lastLogin
        },
        message: 'Dados do usuário obtidos com sucesso'
      });

    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: (error as any).code,
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
   * POST /refresh
   * Renova token JWT (implementação futura)
   * @param req - Request com refresh token
   * @param res - Response com novo token
   */
  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      // Implementação futura para refresh tokens
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Funcionalidade não implementada'
        }
      });

    } catch (error) {
      console.error('Erro no refresh:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      });
    }
  };

  /**
   * GET /health
   * Verifica saúde do serviço de autenticação
   * @param req - Request
   * @param res - Response com status
   */
  health = async (req: Request, res: Response): Promise<void> => {
    try {
      // Testa conexão com banco
      const isHealthy = await this.authService.checkHealth();

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: {
          service: 'auth',
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
          service: 'auth',
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