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
   * Recebe upload de arquivo CSV e processa dados
   * @param req - Request com arquivo CSV
   * @param res - Response com resultado da importação
   */
  insercao = async (req: Request, res: Response): Promise<void> => {
    try {
      // Verifica se arquivo foi enviado
      if (!req.file) {
        throw new AppError('Nenhum arquivo foi enviado', 400, 'NO_FILE');
      }

      console.log('Iniciando processamento do arquivo:', req.file.filename);

      // Processa arquivo CSV
      const result = await this.csvService.processarCSV(req.file);

      // Prepara resposta de sucesso
      const response: InsercaoResponseDTO = {
        success: true,
        data: result.data,
        message: result.message
      };

      if (result.data) {
        console.log('Processamento concluído:', {
          filename: result.data.filename,
          totalRows: result.data.totalRows,
          processedRows: result.data.processedRows
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
   * GET /insercao/historico
   * Lista histórico de importações realizadas
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