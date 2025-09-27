import { query } from '../config/database';
import { 
  UsuarioFinal, 
  UsuarioComPromocoes, 
  ConsultaRequestDTO, 
  ConsultaResponseDTO,
  PaginationParams,
  ConsultaFilters
} from '../types';
import { AppError } from '../middlewares/errorHandler';

/**
 * Serviço de usuários
 * Gerencia consultas e operações relacionadas aos usuários finais
 */
export class UserService {
  /**
   * Consulta usuários com suas promoções vigentes
   * @param params - Parâmetros de consulta e filtros
   * @returns Lista paginada de usuários com promoções
   */
  async consultarUsuarios(params: ConsultaRequestDTO): Promise<ConsultaResponseDTO> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 10;
      const offset = (page - 1) * limit;

      // Constrói filtros dinâmicos
      const filters = this.buildFilters(params);
      const whereClause = filters.conditions.length > 0 
        ? `WHERE ${filters.conditions.join(' AND ')}`
        : '';

      // Query para contar total de registros
      const countQuery = `
        SELECT COUNT(DISTINCT u.smartico_user_id) as total
        FROM usuarios_final u
        LEFT JOIN usuario_promocao up ON u.smartico_user_id = up.smartico_user_id
        LEFT JOIN promocoes p ON up.promocao_id = p.promocao_id
        ${whereClause}
      `;

      // Query principal com dados dos usuários e promoções
      const dataQuery = `
        SELECT 
          u.smartico_user_id,
          u.user_ext_id,
          u.core_sm_brand_id,
          u.crm_brand_id,
          u.ext_brand_id,
          u.crm_brand_name,
          u.created_at as user_created_at,
          u.updated_at as user_updated_at,
          COALESCE(
            JSON_AGG(
              CASE 
                WHEN p.promocao_id IS NOT NULL THEN
                  JSON_BUILD_OBJECT(
                    'promocao_id', p.promocao_id,
                    'nome', p.nome,
                    'regras', COALESCE(up.regras, p.regras),
                    'data_inicio', up.data_inicio,
                    'data_fim', up.data_fim,
                    'status', up.status,
                    'data_vinculo', up.data_vinculo
                  )
                ELSE NULL
              END
            ) FILTER (WHERE p.promocao_id IS NOT NULL),
            '[]'::json
          ) as promocoes
        FROM usuarios_final u
        LEFT JOIN usuario_promocao up ON u.smartico_user_id = up.smartico_user_id
        LEFT JOIN promocoes p ON up.promocao_id = p.promocao_id
        ${whereClause}
        GROUP BY u.smartico_user_id, u.user_ext_id, u.core_sm_brand_id, 
                 u.crm_brand_id, u.ext_brand_id, u.crm_brand_name,
                 u.created_at, u.updated_at
        ORDER BY u.smartico_user_id DESC
        LIMIT $${filters.params.length + 1} OFFSET $${filters.params.length + 2}
      `;

      // Executa as queries
      const [countResult, dataResult] = await Promise.all([
        query(countQuery, filters.params),
        query(dataQuery, [...filters.params, limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Processa os dados dos usuários
      const usuarios: UsuarioComPromocoes[] = dataResult.rows.map(row => ({
        smartico_user_id: row.smartico_user_id,
        user_ext_id: row.user_ext_id,
        core_sm_brand_id: row.core_sm_brand_id,
        crm_brand_id: row.crm_brand_id,
        ext_brand_id: row.ext_brand_id,
        crm_brand_name: row.crm_brand_name,
        created_at: row.user_created_at,
        updated_at: row.user_updated_at,
        promocoes: row.promocoes || []
      }));

      return {
        success: true,
        data: usuarios,
        pagination: {
          page,
          limit,
          total,
          totalPages
        },
        message: `${usuarios.length} usuários encontrados`
      };

    } catch (error) {
      console.error('Erro ao consultar usuários:', error);
      throw new AppError('Erro interno do servidor', 500, 'USER_QUERY_ERROR');
    }
  }

  /**
   * Busca usuário específico por ID
   * @param smarticoUserId - ID do usuário
   * @returns Dados do usuário com promoções
   */
  async buscarUsuarioPorId(smarticoUserId: number): Promise<UsuarioComPromocoes | null> {
    try {
      const userQuery = `
        SELECT 
          u.smartico_user_id,
          u.user_ext_id,
          u.core_sm_brand_id,
          u.crm_brand_id,
          u.ext_brand_id,
          u.crm_brand_name,
          u.created_at as user_created_at,
          u.updated_at as user_updated_at,
          COALESCE(
            JSON_AGG(
              CASE 
                WHEN p.promocao_id IS NOT NULL THEN
                  JSON_BUILD_OBJECT(
                    'promocao_id', p.promocao_id,
                    'nome', p.nome,
                    'regras', COALESCE(up.regras, p.regras),
                    'data_inicio', up.data_inicio,
                    'data_fim', up.data_fim,
                    'status', up.status,
                    'data_vinculo', up.data_vinculo
                  )
                ELSE NULL
              END
            ) FILTER (WHERE p.promocao_id IS NOT NULL),
            '[]'::json
          ) as promocoes
        FROM usuarios_final u
        LEFT JOIN usuario_promocao up ON u.smartico_user_id = up.smartico_user_id
        LEFT JOIN promocoes p ON up.promocao_id = p.promocao_id
        WHERE u.smartico_user_id = $1
        GROUP BY u.smartico_user_id, u.user_ext_id, u.core_sm_brand_id, 
                 u.crm_brand_id, u.ext_brand_id, u.crm_brand_name,
                 u.created_at, u.updated_at
      `;

      const result = await query(userQuery, [smarticoUserId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        smartico_user_id: row.smartico_user_id,
        user_ext_id: row.user_ext_id,
        core_sm_brand_id: row.core_sm_brand_id,
        crm_brand_id: row.crm_brand_id,
        ext_brand_id: row.ext_brand_id,
        crm_brand_name: row.crm_brand_name,
        created_at: row.user_created_at,
        updated_at: row.user_updated_at,
        promocoes: row.promocoes || []
      };

    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      throw new AppError('Erro interno do servidor', 500, 'USER_FETCH_ERROR');
    }
  }

  /**
   * Obtém estatísticas gerais dos usuários
   * @returns Estatísticas do sistema
   */
  async obterEstatisticas(): Promise<{
    totalUsuarios: number;
    totalPromocoes: number;
    promocoesAtivas: number;
    vinculosAtivos: number;
  }> {
    try {
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM usuarios_final) as total_usuarios,
          (SELECT COUNT(*) FROM promocoes) as total_promocoes,
          (SELECT COUNT(*) FROM promocoes WHERE status = 'active') as promocoes_ativas,
          (SELECT COUNT(*) FROM usuario_promocao WHERE status = 'active') as vinculos_ativos
      `;

      const result = await query(statsQuery);
      const stats = result.rows[0];

      return {
        totalUsuarios: parseInt(stats.total_usuarios),
        totalPromocoes: parseInt(stats.total_promocoes),
        promocoesAtivas: parseInt(stats.promocoes_ativas),
        vinculosAtivos: parseInt(stats.vinculos_ativos)
      };

    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw new AppError('Erro interno do servidor', 500, 'STATS_ERROR');
    }
  }

  /**
   * Constrói filtros dinâmicos para a query
   * @param params - Parâmetros de filtro
   * @returns Objeto com condições e parâmetros
   */
  private buildFilters(params: ConsultaRequestDTO): {
    conditions: string[];
    params: any[];
  } {
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.smartico_user_id) {
      conditions.push(`u.smartico_user_id = $${paramIndex}`);
      queryParams.push(params.smartico_user_id);
      paramIndex++;
    }

    if (params.crm_brand_id) {
      conditions.push(`u.crm_brand_id = $${paramIndex}`);
      queryParams.push(params.crm_brand_id);
      paramIndex++;
    }

    if (params.status) {
      conditions.push(`up.status = $${paramIndex}`);
      queryParams.push(params.status);
      paramIndex++;
    }

    if (params.data_inicio) {
      conditions.push(`up.data_inicio >= $${paramIndex}`);
      queryParams.push(new Date(params.data_inicio));
      paramIndex++;
    }

    if (params.data_fim) {
      conditions.push(`up.data_fim <= $${paramIndex}`);
      queryParams.push(new Date(params.data_fim));
      paramIndex++;
    }

    return {
      conditions,
      params: queryParams
    };
  }

  /**
   * Lista usuários por brand
   * @param crmBrandId - ID da brand
   * @returns Lista de usuários da brand
   */
  async listarUsuariosPorBrand(crmBrandId: number): Promise<UsuarioFinal[]> {
    try {
      const usersQuery = `
        SELECT * FROM usuarios_final 
        WHERE crm_brand_id = $1
        ORDER BY smartico_user_id DESC
      `;

      const result = await query(usersQuery, [crmBrandId]);
      return result.rows;

    } catch (error) {
      console.error('Erro ao listar usuários por brand:', error);
      throw new AppError('Erro interno do servidor', 500, 'BRAND_USERS_ERROR');
    }
  }

  /**
   * Obtém histórico de promoções de um usuário
   * @param smartico_user_id - ID do usuário
   * @returns Histórico de promoções
   */
  async getUserPromotionHistory(smartico_user_id: number): Promise<any[]> {
    try {
      const result = await query(`
        SELECT 
          h.*,
          p.nome as promocao_nome
        FROM usuario_promocao_historico h
        LEFT JOIN promocoes p ON h.promocao_id = p.promocao_id
        WHERE h.smartico_user_id = $1
        ORDER BY h.added_date DESC
      `, [smartico_user_id]);

      return result.rows;
    } catch (error) {
      console.error('Erro ao obter histórico de promoções:', error);
      throw new AppError('Erro interno do servidor', 500, 'USER_HISTORY_ERROR');
    }
  }

  /**
   * Obtém estatísticas gerais do sistema
   * @returns Estatísticas do sistema
   */
  async getSystemStats(): Promise<any> {
    try {
      const [usersResult, promotionsResult, activePromotionsResult, brandsResult] = await Promise.all([
        query('SELECT COUNT(*) as total FROM usuarios_final'),
        query('SELECT COUNT(*) as total FROM promocoes'),
        query('SELECT COUNT(*) as total FROM usuario_promocao WHERE status = $1', ['active']),
        query('SELECT COUNT(DISTINCT crm_brand_name) as total FROM usuarios_final WHERE crm_brand_name IS NOT NULL')
      ]);

      return {
        totalUsers: parseInt(usersResult.rows[0].total),
        totalPromotions: parseInt(promotionsResult.rows[0].total),
        activeUserPromotions: parseInt(activePromotionsResult.rows[0].total),
        totalBrands: parseInt(brandsResult.rows[0].total)
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw new AppError('Erro interno do servidor', 500, 'STATS_ERROR');
    }
  }

  /**
   * Lista usuários por marca
   * @returns Lista de marcas com contagem de usuários
   */
  async getUsersByBrand(): Promise<any[]> {
    try {
      const result = await query(`
        SELECT 
          crm_brand_name,
          crm_brand_id,
          COUNT(*) as user_count
        FROM usuarios_final 
        WHERE crm_brand_name IS NOT NULL
        GROUP BY crm_brand_name, crm_brand_id
        ORDER BY user_count DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Erro ao obter usuários por marca:', error);
      throw new AppError('Erro interno do servidor', 500, 'BRANDS_ERROR');
    }
  }

  /**
   * Verifica saúde do serviço de usuários
   * @returns Status da saúde do serviço
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Testa conexão com banco fazendo uma consulta simples
      await query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Erro no health check do UserService:', error);
      return false;
    }
  }
}