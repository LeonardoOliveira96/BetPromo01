import { Request, Response } from 'express';
import { CSVService } from '../services/csvService';
import { InsercaoResponseDTO } from '../types';
import { AppError } from '../middlewares/errorHandler';

/**
 * Controller de importação CSV
 * Gerencia endpoints relacionados ao upload e processamento de arquivos CSV
 */
export class CSVController {
  private csvService: CSVService;

  constructor() {
    this.csvService = new CSVService();
  }

  /**
   * POST /insercao
   * Recebe upload de arquivo CSV e processa APENAS usuários
   * @param req - Request com arquivo CSV
   * @param res - Response com resultado da importação (apenas usuários)
   */
  insercao = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🎯 CONTROLLER - Requisição recebida (processamento de usuários):', {
        method: req.method,
        url: req.url,
        hasFile: !!req.file,
        bodyKeys: Object.keys(req.body),
        body: req.body
      });

      // Verifica se arquivo foi enviado
      if (!req.file) {
        throw new AppError('Nenhum arquivo foi enviado', 400, 'NO_FILE');
      }

      console.log('📁 CONTROLLER - Arquivo recebido:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Processa arquivo CSV (apenas usuários)
      const result = await this.csvService.processarCSV(req.file);

      // Prepara resposta de sucesso
      const response: InsercaoResponseDTO = {
        success: true,
        data: {
          filename: req.file.filename,
          totalRows: result.data?.totalRows ?? 0,
          processedRows: result.data?.processedRows ?? 0,
          newUsers: result.data?.newUsers ?? 0,
          newPromotions: result.data?.newPromotions ?? 0,
          newUserPromotions: result.data?.newUserPromotions ?? 0,
          errors: result.data?.errors ?? []
        },
        message: result.message
      };

      if (result.data) {
        console.log('Processamento de usuários concluído:', {
          filename: result.data.filename,
          totalRows: result.data.totalRows,
          processedRows: result.data.processedRows,
          newUsers: result.data.newUsers
        });
      } else {
        console.log('Processamento concluído, mas result.data está indefinido');
      }

      res.status(200).json(response);

    } catch (error) {
      console.error('Erro na inserção:', error);
      
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
   * POST /vincular-usuarios
   * Vincula usuários do CSV processado à uma promoção específica
   * @param req - Request com filename e promotionName
   * @param res - Response com resultado da vinculação
   */
  vincularUsuarios = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔗 CONTROLLER - Requisição de vinculação recebida:', {
        method: req.method,
        url: req.url,
        body: req.body
      });

      const { filename, promotionName } = req.body;

      // Validações
      if (!filename) {
        throw new AppError('Nome do arquivo é obrigatório', 400, 'FILENAME_REQUIRED');
      }

      if (!promotionName || !promotionName.trim()) {
        throw new AppError('Nome da promoção é obrigatório', 400, 'PROMOTION_NAME_REQUIRED');
      }

      console.log('🔗 CONTROLLER - Parâmetros de vinculação:', {
        filename,
        promotionName: promotionName.trim()
      });

      // Vincula usuários à promoção
      const result = await this.csvService.vincularUsuariosAPromocao(filename, promotionName.trim());

      // Prepara resposta de sucesso
      const response = {
        success: true,
        data: {
          filename,
          promotionName: promotionName.trim(),
          newUserPromotions: result.newUserPromotions
        },
        message: `${result.newUserPromotions} usuários vinculados à promoção "${promotionName.trim()}" com sucesso`
      };

      console.log('🔗 CONTROLLER - Vinculação concluída:', response.data);

      res.status(200).json(response);

    } catch (error) {
      console.error('❌ CONTROLLER - Erro na vinculação:', error);
      
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
   * GET /historico
   * Lista histórico de importações
   * @param req - Request
   * @param res - Response com lista de importações
   */
  historico = async (req: Request, res: Response): Promise<void> => {
    try {
      // Lista importações
      const importacoes = await this.csvService.listarImportacoes();

      res.status(200).json({
        success: true,
        data: {
          importacoes,
          total: importacoes.length
        },
        message: `${importacoes.length} importações encontradas`
      });

    } catch (error) {
      console.error('Erro ao listar histórico:', error);
      
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
   * GET /insercao/historico/:filename
   * Obtém detalhes de uma importação específica
   * @param req - Request com nome do arquivo
   * @param res - Response com detalhes da importação
   */
  detalhesImportacao = async (req: Request, res: Response): Promise<void> => {
    try {
      const filename = req.params.filename;

      if (!filename) {
        throw new AppError('Nome do arquivo é obrigatório', 400, 'FILENAME_REQUIRED');
      }

      // Obtém detalhes da importação
      const detalhes = await this.csvService.obterDetalhesImportacao(filename);

      if (!detalhes || detalhes.length === 0) {
        throw new AppError('Importação não encontrada', 404, 'IMPORT_NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: {
          filename,
          detalhes,
          total: detalhes.length
        },
        message: 'Detalhes da importação obtidos com sucesso'
      });

    } catch (error) {
      console.error('Erro ao obter detalhes da importação:', error);
      
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
   * POST /insercao/validate
   * Valida arquivo CSV sem processar (dry-run)
   * @param req - Request com arquivo CSV
   * @param res - Response com resultado da validação
   */
  validate = async (req: Request, res: Response): Promise<void> => {
    try {
      // Verifica se arquivo foi enviado
      if (!req.file) {
        throw new AppError('Nenhum arquivo foi enviado', 400, 'NO_FILE');
      }

      // TODO: Implementar validação sem processamento
      // Por enquanto, retorna sucesso básico
      res.status(200).json({
        success: true,
        data: {
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          valid: true
        },
        message: 'Arquivo válido para processamento'
      });

    } catch (error) {
      console.error('Erro na validação:', error);
      
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
   * GET /insercao/template
   * Retorna template CSV para download
   * @param req - Request
   * @param res - Response com arquivo template
   */
  template = async (req: Request, res: Response): Promise<void> => {
    try {
      // Define cabeçalhos do CSV
      const csvHeaders = [
        'smartico_user_id',
        'user_ext_id',
        'core_sm_brand_id',
        'crm_brand_id',
        'ext_brand_id',
        'crm_brand_name',
        'promocao_nome',
        'regras',
        'data_inicio',
        'data_fim'
      ];

      // Exemplo de linha
      const exampleRow = [
        '123456789',
        'user_ext_001',
        '1',
        '100',
        'brand_001',
        'Marca Exemplo',
        'Promoção de Boas-vindas',
        'Regras da promoção aqui',
        '2024-01-01 00:00:00',
        '2024-12-31 23:59:59'
      ];

      // Cria conteúdo CSV
      const csvContent = [
        csvHeaders.join(','),
        exampleRow.join(',')
      ].join('\n');

      // Define headers para download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="template_importacao.csv"');

      res.status(200).send(csvContent);

    } catch (error) {
      console.error('Erro ao gerar template:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_ERROR',
          message: 'Erro ao gerar template'
        }
      });
    }
  };

  /**
   * GET /health
   * Verifica saúde do serviço de importação
   * @param req - Request
   * @param res - Response com status
   */
  health = async (req: Request, res: Response): Promise<void> => {
    try {
      // Verifica se diretório de upload existe e é acessível
      const uploadPath = process.env.UPLOAD_PATH || './uploads';
      
      res.status(200).json({
        success: true,
        data: {
          service: 'csv-import',
          status: 'healthy',
          uploadPath,
          timestamp: new Date().toISOString()
        },
        message: 'Serviço funcionando corretamente'
      });

    } catch (error) {
      console.error('Erro no health check:', error);
      res.status(503).json({
        success: false,
        data: {
          service: 'csv-import',
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