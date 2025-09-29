import { query } from '../config/database';
import { AppError } from '../middlewares/errorHandler';

/**
 * Interface para parâmetros de busca
 */
interface SearchParams {
  query: string;
  type: 'smartico_user_id' | 'user_ext_id' | 'both';
  page: number;
  limit: number;
}

/**
 * Interface para resultado de busca
 */
interface SearchResult {
  users: any[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Interface para sugestão rápida
 */
interface QuickSuggestion {
  smartico_user_id: number;
  user_ext_id: string;
  crm_brand_name: string;
}

/**
 * Serviço de busca otimizada
 * Implementa queries SQL otimizadas utilizando índices para performance
 */
export class SearchService {
  
  /**
   * Busca usuários por smartico_user_id ou user_ext_id
   * Utiliza índices otimizados para performance
   */
  async searchUsers(params: SearchParams): Promise<SearchResult> {
    try {
      const { query: searchQuery, type, page, limit } = params;
      const offset = (page - 1) * limit;

      // Construir condições WHERE baseadas no tipo de busca
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (type === 'smartico_user_id') {
        // Busca apenas por smartico_user_id (usa índice primário)
        const numericQuery = parseInt(searchQuery);
        if (!isNaN(numericQuery)) {
          whereConditions.push(`u.smartico_user_id = $${paramIndex}`);
          queryParams.push(numericQuery);
          paramIndex++;
        } else {
          // Se não for numérico, não há resultados para smartico_user_id
          return {
            users: [],
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalCount: 0,
              limit,
              hasNextPage: false,
              hasPrevPage: false
            }
          };
        }
      } else if (type === 'user_ext_id') {
        // Busca apenas por user_ext_id (usa índice idx_usuarios_final_user_ext_id)
        whereConditions.push(`u.user_ext_id ILIKE $${paramIndex}`);
        queryParams.push(`%${searchQuery}%`);
        paramIndex++;
      } else {
        // Busca em ambos os campos (both)
        const numericQuery = parseInt(searchQuery);
        if (!isNaN(numericQuery)) {
          // Se for numérico, busca por smartico_user_id OU user_ext_id
          whereConditions.push(`(u.smartico_user_id = $${paramIndex} OR u.user_ext_id ILIKE $${paramIndex + 1})`);
          queryParams.push(numericQuery, `%${searchQuery}%`);
          paramIndex += 2;
        } else {
          // Se não for numérico, busca apenas por user_ext_id
          whereConditions.push(`u.user_ext_id ILIKE $${paramIndex}`);
          queryParams.push(`%${searchQuery}%`);
          paramIndex++;
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Query para contar total de registros
      const countQuery = `
        SELECT COUNT(DISTINCT u.smartico_user_id) as total
        FROM usuarios_final u
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
          u.created_at,
          u.updated_at,
          COALESCE(
            ARRAY_AGG(
              DISTINCT p.nome
              ORDER BY p.nome
            ) FILTER (WHERE p.nome IS NOT NULL AND up.data_fim >= CURRENT_DATE),
            ARRAY[]::text[]
          ) as current_promotions
        FROM usuarios_final u
        LEFT JOIN usuario_promocao up ON u.smartico_user_id = up.smartico_user_id
        LEFT JOIN promocoes p ON up.promocao_id = p.promocao_id
        ${whereClause}
        GROUP BY 
          u.smartico_user_id,
          u.user_ext_id,
          u.core_sm_brand_id,
          u.crm_brand_id,
          u.ext_brand_id,
          u.crm_brand_name,
          u.created_at,
          u.updated_at
        ORDER BY u.updated_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      // Executar queries
      const [countResult, dataResult] = await Promise.all([
        query(countQuery, queryParams),
        query(dataQuery, [...queryParams, limit, offset])
      ]);

      const totalCount = parseInt(countResult.rows[0]?.total || '0');
      const totalPages = Math.ceil(totalCount / limit);

      return {
        users: dataResult.rows.map(row => ({
          _id: `user_${row.smartico_user_id}`,
          smartico_user_id: row.smartico_user_id,
          user_ext_id: row.user_ext_id,
          core_sm_brand_id: row.core_sm_brand_id,
          crm_brand_id: row.crm_brand_id,
          ext_brand_id: row.ext_brand_id,
          crm_brand_name: row.crm_brand_name,
          current_promotions: row.current_promotions || [],
          created_at: row.created_at,
          updated_at: row.updated_at
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };

    } catch (error) {
      console.error('Erro na busca de usuários:', error);
      throw new AppError('Erro ao buscar usuários', 500, 'SEARCH_ERROR');
    }
  }

  /**
   * Busca usuário por ID específico
   * Retorna detalhes completos do usuário incluindo promoções ativas
   */
  async getUserById(userId: string, type: string = 'smartico_user_id'): Promise<any> {
    try {
      let whereCondition: string;
      let queryParams: any[] = [];

      if (type === 'smartico_user_id') {
        const numericId = parseInt(userId);
        if (isNaN(numericId)) {
          throw new AppError('ID inválido para smartico_user_id', 400, 'INVALID_ID');
        }
        whereCondition = 'u.smartico_user_id = $1';
        queryParams.push(numericId);
      } else if (type === 'user_ext_id') {
        whereCondition = 'u.user_ext_id = $1';
        queryParams.push(userId);
      } else {
        throw new AppError('Tipo de busca inválido', 400, 'INVALID_SEARCH_TYPE');
      }

      // Query para buscar o usuário com suas promoções ativas
      const userQuery = `
        SELECT 
          u.smartico_user_id,
          u.user_ext_id,
          u.core_sm_brand_id,
          u.crm_brand_id,
          u.ext_brand_id,
          u.crm_brand_name,
          u.created_at,
          u.updated_at,
          COALESCE(
            ARRAY_AGG(
              DISTINCT p.nome
              ORDER BY p.nome
            ) FILTER (WHERE p.nome IS NOT NULL AND up.data_fim >= CURRENT_DATE),
            ARRAY[]::text[]
          ) as current_promotions
        FROM usuarios_final u
        LEFT JOIN usuario_promocao up ON u.smartico_user_id = up.smartico_user_id
        LEFT JOIN promocoes p ON up.promocao_id = p.promocao_id
        WHERE ${whereCondition}
        GROUP BY 
          u.smartico_user_id,
          u.user_ext_id,
          u.core_sm_brand_id,
          u.crm_brand_id,
          u.ext_brand_id,
          u.crm_brand_name,
          u.created_at,
          u.updated_at
      `;

      const result = await query(userQuery, queryParams);

      if (result.rows.length === 0) {
        throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
      }

      const user = result.rows[0];
      return {
        _id: `user_${user.smartico_user_id}`,
        smartico_user_id: user.smartico_user_id,
        user_ext_id: user.user_ext_id,
        core_sm_brand_id: user.core_sm_brand_id,
        crm_brand_id: user.crm_brand_id,
        ext_brand_id: user.ext_brand_id,
        crm_brand_name: user.crm_brand_name,
        current_promotions: user.current_promotions || [],
        created_at: user.created_at,
        updated_at: user.updated_at
      };

    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar usuário', 500, 'GET_USER_ERROR');
    }
  }

  /**
   * Busca rápida para autocomplete
   * Limitada a 10 resultados para performance
   */
  async quickSearch(searchQuery: string): Promise<QuickSuggestion[]> {
    try {
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Determinar tipo de busca baseado no input
      const numericQuery = parseInt(searchQuery);
      if (!isNaN(numericQuery)) {
        // Se for numérico, busca por smartico_user_id OU user_ext_id
        whereConditions.push(`(u.smartico_user_id = $${paramIndex} OR u.user_ext_id ILIKE $${paramIndex + 1})`);
        queryParams.push(numericQuery, `%${searchQuery}%`);
        paramIndex += 2;
      } else {
        // Se não for numérico, busca apenas por user_ext_id
        whereConditions.push(`u.user_ext_id ILIKE $${paramIndex}`);
        queryParams.push(`%${searchQuery}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Query otimizada para busca rápida
      const quickQuery = `
        SELECT 
          u.smartico_user_id,
          u.user_ext_id,
          u.crm_brand_name
        FROM usuarios_final u
        ${whereClause}
        ORDER BY 
          CASE 
            WHEN u.smartico_user_id::text = $${paramIndex} THEN 1
            WHEN u.user_ext_id = $${paramIndex + 1} THEN 2
            ELSE 3
          END,
          u.updated_at DESC
        LIMIT 10
      `;

      queryParams.push(searchQuery, searchQuery);

      const result = await query(quickQuery, queryParams);

      return result.rows.map(row => ({
        smartico_user_id: row.smartico_user_id,
        user_ext_id: row.user_ext_id,
        crm_brand_name: row.crm_brand_name
      }));

    } catch (error) {
      console.error('Erro na busca rápida:', error);
      throw new AppError('Erro na busca rápida', 500, 'QUICK_SEARCH_ERROR');
    }
  }
}