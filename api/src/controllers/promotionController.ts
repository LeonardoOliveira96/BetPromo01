import { Request, Response } from 'express';
import { PromotionService } from '../services/promotionService';
import { CSVService } from '../services/csvService';
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
  marca: z.string().optional(),
  tipo: z.string().optional(),
  notifications: z.object({
    sms: z.boolean().default(false),
    email: z.boolean().default(false),
    popup: z.boolean().default(false),
    push: z.boolean().default(false),
    whatsapp: z.boolean().default(false),
    telegram: z.boolean().default(false)
  }).optional(),
  targetUserIds: z.array(z.number()).optional(),
  scheduleActivation: z.boolean().default(false),
  csvFilename: z.string().optional()
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
  private csvService: CSVService;

  constructor() {
    this.promotionService = new PromotionService();
    this.csvService = new CSVService();
  }

  /**
   * Criar nova promoção
   */
  async createPromotion(req: Request, res: Response): Promise<void> {
    try {
      console.log('🚀 CONTROLLER - Dados recebidos do frontend:', JSON.stringify(req.body, null, 2));
      
      const { nome, descricao, tipo, data_inicio, data_fim, status } = req.body;

      console.log('🔍 CONTROLLER - ANÁLISE DETALHADA DAS DATAS RECEBIDAS:');
      console.log('  - data_inicio (raw):', data_inicio);
      console.log('  - data_inicio (type):', typeof data_inicio);
      console.log('  - data_fim (raw):', data_fim);
      console.log('  - data_fim (type):', typeof data_fim);

      // Converter strings de data para objetos Date
      const startDate = new Date(data_inicio);
      const endDate = new Date(data_fim);

      console.log('📅 CONTROLLER - CONVERSÃO PARA OBJETOS DATE:');
      console.log('  - startDate:', startDate);
      console.log('  - startDate.toString():', startDate.toString());
      console.log('  - startDate.toISOString():', startDate.toISOString());
      console.log('  - startDate.getFullYear():', startDate.getFullYear());
      console.log('  - startDate.getMonth():', startDate.getMonth() + 1);
      console.log('  - startDate.getDate():', startDate.getDate());
      
      console.log('  - endDate:', endDate);
      console.log('  - endDate.toString():', endDate.toString());
      console.log('  - endDate.toISOString():', endDate.toISOString());
      console.log('  - endDate.getFullYear():', endDate.getFullYear());
      console.log('  - endDate.getMonth():', endDate.getMonth() + 1);
      console.log('  - endDate.getDate():', endDate.getDate());

      const validatedData = createPromotionSchema.parse(req.body);
      
      console.log('✅ BACKEND - Dados validados pelo schema:');
      console.log('  - Nome:', validatedData.nome);
      console.log('  - Regras:', validatedData.regras);
      console.log('  - Data início (string):', validatedData.data_inicio);
      console.log('  - Data fim (string):', validatedData.data_fim);
      console.log('  - Status:', validatedData.status);
      console.log('  - Marca:', validatedData.marca);
      console.log('  - Tipo:', validatedData.tipo);
      console.log('  - Notificações:', validatedData.notifications);
      
      // Converter strings de data para Date objects e processar notificações
      const promotionData = {
        nome: validatedData.nome,
        regras: validatedData.regras,
        data_inicio: validatedData.data_inicio ? new Date(validatedData.data_inicio) : undefined,
        data_fim: validatedData.data_fim ? new Date(validatedData.data_fim) : undefined,
        status: validatedData.status,
        marca: validatedData.marca,
        tipo: validatedData.tipo,
        notification_sms: validatedData.notifications?.sms || false,
        notification_email: validatedData.notifications?.email || false,
        notification_popup: validatedData.notifications?.popup || false,
        notification_push: validatedData.notifications?.push || false,
        notification_whatsapp: validatedData.notifications?.whatsapp || false,
        notification_telegram: validatedData.notifications?.telegram || false
      };

      console.log('📦 CONTROLLER - OBJETO PROMOTION_DATA CRIADO:');
      console.log('  - nome:', promotionData.nome);
      console.log('  - data_inicio:', promotionData.data_inicio);
      console.log('  - data_inicio.toISOString():', promotionData.data_inicio?.toISOString());
      console.log('  - data_inicio.getFullYear():', promotionData.data_inicio?.getFullYear());
      console.log('  - data_fim:', promotionData.data_fim);
      console.log('  - data_fim.toISOString():', promotionData.data_fim?.toISOString());
      console.log('  - data_fim.getFullYear():', promotionData.data_fim?.getFullYear());
      console.log('  - Objeto completo:', JSON.stringify(promotionData, null, 2));

      console.log('🔄 BACKEND - Dados processados para o banco:');
      console.log('  - Nome:', promotionData.nome);
      console.log('  - Regras:', promotionData.regras);
      console.log('  - Data início (Date):', promotionData.data_inicio);
      console.log('  - Data início toString:', promotionData.data_inicio?.toString());
      console.log('  - Data início toISOString:', promotionData.data_inicio?.toISOString());
      console.log('  - Data início toLocaleDateString:', promotionData.data_inicio?.toLocaleDateString('pt-BR'));
      console.log('  - Data fim (Date):', promotionData.data_fim);
      console.log('  - Data fim toString:', promotionData.data_fim?.toString());
      console.log('  - Data fim toISOString:', promotionData.data_fim?.toISOString());
      console.log('  - Data fim toLocaleDateString:', promotionData.data_fim?.toLocaleDateString('pt-BR'));
      console.log('  - Status:', promotionData.status);
      console.log('  - Marca:', promotionData.marca);
      console.log('  - Tipo:', promotionData.tipo);

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

      // Se há um arquivo CSV, vincular os usuários do CSV à promoção
      if (validatedData.csvFilename) {
        try {
          await this.csvService.vincularUsuariosAPromocao(
            validatedData.csvFilename,
            validatedData.nome
          );
        } catch (csvError) {
          console.error('Erro ao vincular usuários do CSV:', csvError);
          // Não falha a criação da promoção, apenas registra o erro
        }
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
      
      console.log('📋 Listando promoções com filtros:', validatedQuery);
      
      const result = await this.promotionService.getPromotions(validatedQuery);

      console.log(`📊 Encontradas ${result.promotions.length} promoções de ${result.total} total`);
      
      if (validatedQuery.search) {
        console.log('🔍 Promoções encontradas para busca:', result.promotions.map((p: any) => p.nome));
      }

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
      
      // Converter strings de data para Date objects e processar notificações
      const promotionData = {
        nome: validatedData.nome,
        regras: validatedData.regras,
        data_inicio: validatedData.data_inicio ? new Date(validatedData.data_inicio) : undefined,
        data_fim: validatedData.data_fim ? new Date(validatedData.data_fim) : undefined,
        status: validatedData.status,
        marca: validatedData.marca,
        tipo: validatedData.tipo,
        notification_sms: validatedData.notifications?.sms || false,
        notification_email: validatedData.notifications?.email || false,
        notification_popup: validatedData.notifications?.popup || false,
        notification_push: validatedData.notifications?.push || false,
        notification_whatsapp: validatedData.notifications?.whatsapp || false,
        notification_telegram: validatedData.notifications?.telegram || false
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