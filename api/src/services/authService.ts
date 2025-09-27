import { query } from '../config/database';
import { verifyPassword, generateToken } from '../utils/auth';
import { AdminUser, LoginRequestDTO, LoginResponseDTO } from '../types';
import { AppError } from '../middlewares/errorHandler';

/**
 * Serviço de autenticação
 * Gerencia login e validação de usuários administrativos
 */
export class AuthService {
  /**
   * Realiza login do usuário administrativo
   * @param loginData - Dados de login (email e senha)
   * @returns Resposta com token JWT se bem-sucedido
   */
  async login(loginData: LoginRequestDTO): Promise<LoginResponseDTO> {
    try {
      const { email, password } = loginData;

      // Busca o usuário no banco de dados
      const userQuery = `
        SELECT id, email, password_hash, name, role, is_active
        FROM admin_users 
        WHERE email = $1 AND is_active = true
      `;
      
      const result = await query(userQuery, [email]);

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Email ou senha incorretos'
        };
      }

      const user: AdminUser = result.rows[0];

      // Verifica a senha
      const isPasswordValid = await verifyPassword(password, user.password_hash);

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Email ou senha incorretos'
        };
      }

      // Gera token JWT
      const token = generateToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });

      // Atualiza último login (opcional)
      await query(
        'UPDATE admin_users SET updated_at = NOW() WHERE id = $1',
        [user.id]
      );

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        message: 'Login realizado com sucesso'
      };

    } catch (error) {
      console.error('Erro no serviço de login:', error);
      throw new AppError('Erro interno do servidor', 500, 'LOGIN_ERROR');
    }
  }

  /**
   * Busca usuário por ID
   * @param userId - ID do usuário
   * @returns Dados do usuário ou null se não encontrado
   */
  async getUserById(userId: number): Promise<Omit<AdminUser, 'password_hash'> | null> {
    try {
      const userQuery = `
        SELECT id, email, name, role, created_at, updated_at, is_active
        FROM admin_users 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await query(userQuery, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      throw new AppError('Erro interno do servidor', 500, 'USER_FETCH_ERROR');
    }
  }

  /**
   * Busca usuário por email
   * @param email - Email do usuário
   * @returns Dados do usuário ou null se não encontrado
   */
  async getUserByEmail(email: string): Promise<Omit<AdminUser, 'password_hash'> | null> {
    try {
      const userQuery = `
        SELECT id, email, name, role, created_at, updated_at, is_active
        FROM admin_users 
        WHERE email = $1 AND is_active = true
      `;
      
      const result = await query(userQuery, [email]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      throw new AppError('Erro interno do servidor', 500, 'USER_FETCH_ERROR');
    }
  }

  /**
   * Valida se o token é válido e retorna dados do usuário
   * @param userId - ID do usuário do token
   * @returns Dados do usuário se válido
   */
  async validateTokenUser(userId: number): Promise<Omit<AdminUser, 'password_hash'> | null> {
    try {
      return await this.getUserById(userId);
    } catch (error) {
      console.error('Erro ao validar usuário do token:', error);
      return null;
    }
  }

  /**
   * Lista todos os usuários administrativos (para administração)
   * @returns Lista de usuários
   */
  async getAllUsers(): Promise<Omit<AdminUser, 'password_hash'>[]> {
    try {
      const usersQuery = `
        SELECT id, email, name, role, created_at, updated_at, is_active
        FROM admin_users 
        ORDER BY created_at DESC
      `;
      
      const result = await query(usersQuery);
      return result.rows;
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw new AppError('Erro interno do servidor', 500, 'USERS_FETCH_ERROR');
    }
  }

  /**
   * Desativa usuário (soft delete)
   * @param userId - ID do usuário a ser desativado
   * @returns True se bem-sucedido
   */
  async deactivateUser(userId: number): Promise<boolean> {
    try {
      const updateQuery = `
        UPDATE admin_users 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `;
      
      const result = await query(updateQuery, [userId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Erro ao desativar usuário:', error);
      throw new AppError('Erro interno do servidor', 500, 'USER_DEACTIVATE_ERROR');
    }
  }

  /**
   * Reativa usuário
   * @param userId - ID do usuário a ser reativado
   * @returns True se bem-sucedido
   */
  async reactivateUser(userId: number): Promise<boolean> {
    try {
      const updateQuery = `
        UPDATE admin_users 
        SET is_active = true, updated_at = NOW()
        WHERE id = $1
      `;
      
      const result = await query(updateQuery, [userId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Erro ao reativar usuário:', error);
      throw new AppError('Erro interno do servidor', 500, 'USER_REACTIVATE_ERROR');
    }
  }

  /**
   * Verifica saúde do serviço de autenticação
   * @returns Status da saúde do serviço
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Testa conexão com banco fazendo uma consulta simples
      await query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Erro no health check do AuthService:', error);
      return false;
    }
  }
}