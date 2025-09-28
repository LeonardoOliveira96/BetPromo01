import { Pool } from 'pg';
import { pool } from '../config/database';
import { Promocao } from '../types';

/**
 * Interface para dados de criação de promoção
 */
interface CreatePromotionData {
  nome: string;
  regras?: string;
  data_inicio?: Date;
  data_fim?: Date;
  status: 'active' | 'inactive' | 'scheduled';
}

/**
 * Interface para filtros de listagem
 */
interface PromotionFilters {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

/**
 * Interface para resultado de listagem
 */
interface PromotionListResult {
  promotions: Promocao[];
  total: number;
}

/**
 * Service para gerenciamento de promoções
 */
export class PromotionService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Criar nova promoção
   */
  async createPromotion(data: CreatePromotionData): Promise<Promocao> {
    const client = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO promocoes (nome, regras, data_inicio, data_fim, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const values = [
        data.nome,
        data.regras || null,
        data.data_inicio || null,
        data.data_fim || null,
        data.status
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Listar promoções com filtros
   */
  async getPromotions(filters: PromotionFilters): Promise<PromotionListResult> {
    const client = await this.db.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      // Filtro por status
      if (filters.status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      // Filtro por busca (nome)
      if (filters.search) {
        whereClause += ` AND nome ILIKE $${paramIndex}`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM promocoes
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Query para buscar promoções
      const offset = (filters.page - 1) * filters.limit;
      const dataQuery = `
        SELECT *
        FROM promocoes
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(filters.limit, offset);
      const dataResult = await client.query(dataQuery, params);

      return {
        promotions: dataResult.rows,
        total
      };
    } finally {
      client.release();
    }
  }

  /**
   * Buscar promoção por ID
   */
  async getPromotionById(id: number): Promise<Promocao | null> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT p.*,
               COUNT(up.smartico_user_id) as total_users
        FROM promocoes p
        LEFT JOIN usuario_promocao up ON p.promocao_id = up.promocao_id
        WHERE p.promocao_id = $1
        GROUP BY p.promocao_id
      `;
      
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Atualizar promoção
   */
  async updatePromotion(id: number, data: Partial<CreatePromotionData>): Promise<Promocao | null> {
    const client = await this.db.connect();
    
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Construir query dinamicamente
      if (data.nome !== undefined) {
        fields.push(`nome = $${paramIndex}`);
        values.push(data.nome);
        paramIndex++;
      }

      if (data.regras !== undefined) {
        fields.push(`regras = $${paramIndex}`);
        values.push(data.regras);
        paramIndex++;
      }

      if (data.data_inicio !== undefined) {
        fields.push(`data_inicio = $${paramIndex}`);
        values.push(data.data_inicio);
        paramIndex++;
      }

      if (data.data_fim !== undefined) {
        fields.push(`data_fim = $${paramIndex}`);
        values.push(data.data_fim);
        paramIndex++;
      }

      if (data.status !== undefined) {
        fields.push(`status = $${paramIndex}`);
        values.push(data.status);
        paramIndex++;
      }

      if (fields.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE promocoes
        SET ${fields.join(', ')}
        WHERE promocao_id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Deletar promoção
   */
  async deletePromotion(id: number): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Primeiro, remover vínculos com usuários
      await client.query(
        'DELETE FROM usuario_promocao WHERE promocao_id = $1',
        [id]
      );

      // Depois, remover a promoção
      const result = await client.query(
        'DELETE FROM promocoes WHERE promocao_id = $1',
        [id]
      );

      await client.query('COMMIT');
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Associar usuários específicos a uma promoção
   */
  async associateUsersToPromotion(
    promocaoId: number,
    userIds: number[],
    dataInicio?: Date,
    dataFim?: Date,
    regras?: string
  ): Promise<number> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      let insertedCount = 0;

      for (const userId of userIds) {
        // Verificar se o usuário existe
        const userExists = await client.query(
          'SELECT 1 FROM usuarios_final WHERE smartico_user_id = $1',
          [userId]
        );

        if (userExists.rows.length === 0) {
          console.warn(`Usuário ${userId} não encontrado, pulando...`);
          continue;
        }

        // Inserir vínculo (ignorar se já existe)
        const insertResult = await client.query(`
          INSERT INTO usuario_promocao (
            smartico_user_id, promocao_id, data_inicio, data_fim, regras, status
          )
          VALUES ($1, $2, $3, $4, $5, 'active')
          ON CONFLICT (smartico_user_id, promocao_id) DO NOTHING
        `, [userId, promocaoId, dataInicio || null, dataFim || null, regras || null]);

        if (insertResult.rowCount && insertResult.rowCount > 0) {
          insertedCount++;
        }

        // Inserir no histórico
        await client.query(`
          INSERT INTO usuario_promocao_historico (
            smartico_user_id, promocao_id, status, regras, data_inicio, data_fim, operation_type
          )
          VALUES ($1, $2, 'active', $3, $4, $5, 'manual_insert')
        `, [userId, promocaoId, regras || null, dataInicio || null, dataFim || null]);
      }

      await client.query('COMMIT');
      return insertedCount;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Ativar promoções agendadas que chegaram na hora
   */
  async activateScheduledPromotions(): Promise<number> {
    const client = await this.db.connect();
    
    try {
      const now = new Date();
      
      const result = await client.query(`
        UPDATE promocoes
        SET status = 'active', updated_at = NOW()
        WHERE status = 'scheduled'
          AND data_inicio IS NOT NULL
          AND data_inicio <= $1
      `, [now]);

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Expirar promoções que passaram da data de fim
   */
  async expirePromotions(): Promise<number> {
    const client = await this.db.connect();
    
    try {
      const now = new Date();
      
      const result = await client.query(`
        UPDATE promocoes
        SET status = 'expired', updated_at = NOW()
        WHERE status IN ('active', 'scheduled')
          AND data_fim IS NOT NULL
          AND data_fim <= $1
      `, [now]);

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }
}