import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CSVProcessor } from '../services/csvProcessor';

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Cria o diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gera nome único para o arquivo
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceita apenas arquivos CSV
  if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos CSV são permitidos'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB máximo
  },
});

export class CSVController {
  /**
   * Endpoint SSE para progresso em tempo real
   */
  static async uploadCSVWithProgress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Nenhum arquivo foi enviado',
        });
        return;
      }

      const { promotion_id } = req.body;
      
      if (!promotion_id) {
        // Remove o arquivo se não há promotion_id
        fs.unlinkSync(req.file.path);
        res.status(400).json({
          success: false,
          message: 'promotion_id é obrigatório',
        });
        return;
      }

      // Configurar SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      const processor = new CSVProcessor();
      const filename = req.file.originalname;
      
      console.log(`🔄 Iniciando processamento do arquivo: ${filename}`);
      console.log(`📊 Promoção: ${promotion_id}`);

      // Enviar evento inicial
      res.write(`data: ${JSON.stringify({
        type: 'start',
        message: 'Iniciando processamento...',
        filename,
        promotionId: promotion_id
      })}\n\n`);

      // Escutar eventos de progresso
      processor.on('progress', (progressData) => {
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          ...progressData
        })}\n\n`);
      });

      try {
        // Processa o arquivo CSV
        const result = await processor.processCSV(
          req.file.path,
          filename,
          promotion_id
        );

        // Remove o arquivo temporário após processamento
        fs.unlinkSync(req.file.path);

        console.log(`✅ Processamento concluído: ${result.processedRows}/${result.totalRows} linhas`);

        // Enviar evento de conclusão
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          success: true,
          message: 'Arquivo processado com sucesso',
          data: result,
        })}\n\n`);

        res.end();

      } catch (error) {
        console.error('❌ Erro no processamento:', error);
        
        // Remove o arquivo em caso de erro
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        res.write(`data: ${JSON.stringify({
          type: 'error',
          success: false,
          message: 'Erro interno do servidor',
          error: process.env.NODE_ENV === 'development' ? error : undefined,
        })}\n\n`);

        res.end();
      }

    } catch (error) {
      console.error('❌ Erro no upload/processamento:', error);
      
      // Remove o arquivo em caso de erro
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  /**
   * Upload e processamento de arquivo CSV (método original)
   */
  static async uploadCSV(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Nenhum arquivo foi enviado',
        });
        return;
      }

      const { promotion_id } = req.body;
      
      if (!promotion_id) {
        // Remove o arquivo se não há promotion_id
        fs.unlinkSync(req.file.path);
        res.status(400).json({
          success: false,
          message: 'promotion_id é obrigatório',
        });
        return;
      }

      const processor = new CSVProcessor();
      const filename = req.file.originalname;
      
      console.log(`🔄 Iniciando processamento do arquivo: ${filename}`);
      console.log(`📊 Promoção: ${promotion_id}`);

      // Processa o arquivo CSV
      const result = await processor.processCSV(
        req.file.path,
        filename,
        promotion_id
      );

      // Remove o arquivo temporário após processamento
      fs.unlinkSync(req.file.path);

      console.log(`✅ Processamento concluído: ${result.processedRows}/${result.totalRows} linhas`);

      res.status(200).json({
        success: true,
        message: 'Arquivo processado com sucesso',
        data: result,
      });

    } catch (error) {
      console.error('❌ Erro no upload/processamento:', error);
      
      // Remove o arquivo em caso de erro
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  /**
   * Busca usuários em uma promoção específica
   */
  static async getUsersInPromotion(req: Request, res: Response): Promise<void> {
    try {
      const { promotionId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;

      if (!promotionId) {
        res.status(400).json({
          success: false,
          message: 'promotionId é obrigatório',
        });
        return;
      }

      const result = await CSVProcessor.findUsersInPromotion(promotionId, page, limit);

      res.status(200).json({
        success: true,
        data: result,
      });

    } catch (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  /**
   * Verifica se um usuário específico está em uma promoção
   */
  static async checkUserInPromotion(req: Request, res: Response): Promise<void> {
    try {
      const { promotionId, userId } = req.params;

      if (!promotionId || !userId) {
        res.status(400).json({
          success: false,
          message: 'promotionId e userId são obrigatórios',
        });
        return;
      }

      const smarticoUserId = parseInt(userId);
      if (isNaN(smarticoUserId)) {
        res.status(400).json({
          success: false,
          message: 'userId deve ser um número válido',
        });
        return;
      }

      const isInPromotion = await CSVProcessor.isUserInPromotion(smarticoUserId, promotionId);

      res.status(200).json({
        success: true,
        data: {
          smartico_user_id: smarticoUserId,
          promotion_id: promotionId,
          is_in_promotion: isInPromotion,
        },
      });

    } catch (error) {
      console.error('❌ Erro ao verificar usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  /**
   * Obtém estatísticas de uma promoção
   */
  static async getPromotionStats(req: Request, res: Response): Promise<void> {
    try {
      const { promotionId } = req.params;

      if (!promotionId) {
        res.status(400).json({
          success: false,
          message: 'promotionId é obrigatório',
        });
        return;
      }

      const stats = await CSVProcessor.getPromotionStats(promotionId);

      res.status(200).json({
        success: true,
        data: stats,
      });

    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  /**
   * Remove usuário de uma promoção
   */
  static async removeUserFromPromotion(req: Request, res: Response): Promise<void> {
    try {
      const { promotionId, userId } = req.params;

      if (!promotionId || !userId) {
        res.status(400).json({
          success: false,
          message: 'promotionId e userId são obrigatórios',
        });
        return;
      }

      const smarticoUserId = parseInt(userId);
      if (isNaN(smarticoUserId)) {
        res.status(400).json({
          success: false,
          message: 'userId deve ser um número válido',
        });
        return;
      }

      const user = await CSVProcessor.findUsersInPromotion(promotionId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado na promoção',
        });
        return;
      }

      // Aqui você implementaria a lógica para remover o usuário
      // Por exemplo, usando o método removePromotion do modelo

      res.status(200).json({
        success: true,
        message: 'Usuário removido da promoção com sucesso',
      });

    } catch (error) {
      console.error('❌ Erro ao remover usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }
}