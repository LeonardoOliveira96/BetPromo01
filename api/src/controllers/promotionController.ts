import { Request, Response } from 'express';
import { PromotionService } from '../services/promotionService';
import { z } from 'zod';

/**
 * Schema para criação de promoção com campos estendidos
 */
const createPromotionSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  regras: z.string().optional(),
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  status: z.enum(['active', 'inactive', 'scheduled']).default('active'),
  targetUserIds: z.array(z.number()).optional(),
  scheduleActivation: z.boolean().default(false)
});

/**
 * Schema para listagem de promoções
 */
const listPromotionsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.enum(['active', 'inactive', 'expired', 'scheduled']).optional(),
  search: z.string().optional()
});

/**
 * Controller para gerenciamento de promoções
 */
export class PromotionController {
  private promotionService: PromotionService;

  constructor() {
    this.promotionService = new PromotionService();
  }

  /**
   * Criar nova promoção
   */
  async createPromotion(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createPromotionSchema.parse(req.body);
      
      // Converter strings de data para Date objects
      const promotionData = {
        ...validatedData,
        data_inicio: validatedData.data_inicio ? new Date(validatedData.data_inicio) : undefined,
        data_fim: validatedData.data_fim ? new Date(validatedData.data_fim) : undefined
      };

      // Validar datas
      if (promotionData.data_inicio && promotionData.data_fim) {
        if (promotionData.data_fim <= promotionData.data_inicio) {
          res.status(400).json({
            success: false,
            message: 'Data de fim deve ser posterior à data de início'
          });
          return;
        }
      }

      // Determinar status baseado no agendamento
      if (validatedData.scheduleActivation && promotionData.data_inicio) {
        const now = new Date();
        if (promotionData.data_inicio > now) {
          promotionData.status = 'scheduled';
        }
      }

      const result = await this.promotionService.createPromotion(promotionData);

      // Se há IDs de usuários específicos, associá-los à promoção
      if (validatedData.targetUserIds && validatedData.targetUserIds.length > 0) {
        await this.promotionService.associateUsersToPromotion(
          result.promocao_id,
          validatedData.targetUserIds,
          promotionData.data_inicio,
          promotionData.data_fim,
          promotionData.regras
        );
      }

      res.status(201).json({
        success: true,
        data: result,
        message: 'Promoção criada com sucesso'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors
        });
        return;
      }

      console.error('Erro ao criar promoção:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar promoções
   */
  async getPromotions(req: Request, res: Response): Promise<void> {
    try {
      const validatedQuery = listPromotionsSchema.parse(req.query);
      
      const result = await this.promotionService.getPromotions(validatedQuery);

      res.json({
        success: true,
        data: result.promotions,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: result.total,
          pages: Math.ceil(result.total / validatedQuery.limit)
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Parâmetros inválidos',
          errors: error.errors
        });
        return;
      }

      console.error('Erro ao listar promoções:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter promoção por ID
   */
  async getPromotionById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id || '');
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
        return;
      }

      const promotion = await this.promotionService.getPromotionById(id);

      if (!promotion) {
        res.status(404).json({
          success: false,
          message: 'Promoção não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: promotion
      });
    } catch (error) {
      console.error('Erro ao buscar promoção:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar promoção
   */
  async updatePromotion(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id || '');
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
        return;
      }

      const validatedData = createPromotionSchema.parse(req.body);
      
      // Converter strings de data para Date objects
      const promotionData = {
        ...validatedData,
        data_inicio: validatedData.data_inicio ? new Date(validatedData.data_inicio) : undefined,
        data_fim: validatedData.data_fim ? new Date(validatedData.data_fim) : undefined
      };

      // Validar datas
      if (promotionData.data_inicio && promotionData.data_fim) {
        if (promotionData.data_fim <= promotionData.data_inicio) {
          res.status(400).json({
            success: false,
            message: 'Data de fim deve ser posterior à data de início'
          });
          return;
        }
      }

      const result = await this.promotionService.updatePromotion(id, promotionData);

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Promoção não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: result,
        message: 'Promoção atualizada com sucesso'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors
        });
        return;
      }

      console.error('Erro ao atualizar promoção:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deletar promoção
   */
  async deletePromotion(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id || '');
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
        return;
      }

      const result = await this.promotionService.deletePromotion(id);

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Promoção não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Promoção deletada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar promoção:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}