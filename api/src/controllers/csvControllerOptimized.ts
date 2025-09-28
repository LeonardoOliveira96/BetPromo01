import { Request, Response } from 'express';
import { CSVServiceOptimized } from '../services/csvServiceOptimized';
import { AppError } from '../middlewares/errorHandler';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

/**
 * Controller otimizado para importação CSV
 * Inclui funcionalidades de limpeza automática e monitoramento de disco
 */
export class CSVControllerOptimized {
  private csvService: CSVServiceOptimized;
  private uploadDir: string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.csvService = new CSVServiceOptimized();
    this.uploadDir = process.env.UPLOAD_PATH || './uploads';
    this.startAutomaticCleanup();
  }

  /**
   * Importação otimizada de CSV
   * @param req - Request com arquivo CSV
   * @param res - Response
   */
  async importarCSVOtimizado(req: Request, res: Response): Promise<void> {
    try {
      console.log('🚀 Iniciando importação otimizada de CSV');
      
      if (!req.file) {
        throw new AppError('Nenhum arquivo foi enviado', 400, 'NO_FILE');
      }

      // Log de informações do arquivo
      console.log(`📁 Arquivo recebido: ${req.file.originalname}`);
      console.log(`📊 Tamanho: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`💾 Localização: ${req.file.path}`);

      // Processa o arquivo de forma otimizada
      const resultado = await this.csvService.processarCSVOtimizado(req.file);

      // Log de sucesso
      console.log('✅ Importação otimizada concluída com sucesso');
      console.log(`📈 Estatísticas: ${resultado.data?.processedRows ?? 0} registros processados`);

      res.status(200).json(resultado);

    } catch (error) {
      console.error('❌ Erro na importação otimizada:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: (error as AppError & { code?: string }).code
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor na importação otimizada',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  }

  /**
   * Limpeza manual de arquivos antigos
   * @param req - Request
   * @param res - Response
   */
  async limparArquivos(req: Request, res: Response): Promise<void> {
    try {
      const { maxAgeHours = 1 } = req.body;
      
      console.log(`🧹 Iniciando limpeza manual de arquivos (idade máxima: ${maxAgeHours}h)`);
      
      await this.csvService.cleanupOldFiles(maxAgeHours);
      
      res.status(200).json({
        success: true,
        message: `Limpeza de arquivos concluída (arquivos com mais de ${maxAgeHours}h removidos)`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Erro na limpeza de arquivos:', error);
      
      res.status(500).json({
        success: false,
        message: 'Erro ao limpar arquivos',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Verifica status do disco e arquivos
   * @param req - Request
   * @param res - Response
   */
  async verificarStatusDisco(req: Request, res: Response): Promise<void> {
    try {
      console.log('📊 Verificando status do disco e arquivos');
      
      const diskInfo = await this.getDiskInfo();
      const fileInfo = await this.getFileInfo();
      
      res.status(200).json({
        success: true,
        data: {
          disk: diskInfo,
          files: fileInfo,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Erro ao verificar status do disco:', error);
      
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar status do disco',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Força limpeza imediata de todos os arquivos
   * @param req - Request
   * @param res - Response
   */
  async limpezaForcada(req: Request, res: Response): Promise<void> {
    try {
      console.log('🚨 Iniciando limpeza forçada de todos os arquivos');
      
      const files = await readdir(this.uploadDir);
      let removedCount = 0;
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        try {
          const stats = await stat(filePath);
          totalSize += stats.size;
          
          fs.unlinkSync(filePath);
          removedCount++;
          console.log(`🗑️ Arquivo removido: ${file}`);
        } catch (fileError) {
          console.error(`❌ Erro ao remover ${file}:`, fileError);
        }
      }

      const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
      
      res.status(200).json({
        success: true,
        message: `Limpeza forçada concluída: ${removedCount} arquivos removidos`,
        data: {
          removedFiles: removedCount,
          freedSpaceMB: sizeMB,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Erro na limpeza forçada:', error);
      
      res.status(500).json({
        success: false,
        message: 'Erro na limpeza forçada',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Configura limpeza automática
   * @param req - Request
   * @param res - Response
   */
  async configurarLimpezaAutomatica(req: Request, res: Response): Promise<void> {
    try {
      const { intervalMinutes = 30, maxAgeHours = 1 } = req.body;
      
      // Para o intervalo atual se existir
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      
      // Inicia novo intervalo
      this.cleanupInterval = setInterval(async () => {
        try {
          console.log('🔄 Executando limpeza automática programada');
          await this.csvService.cleanupOldFiles(maxAgeHours);
        } catch (error) {
          console.error('❌ Erro na limpeza automática:', error);
        }
      }, intervalMinutes * 60 * 1000);
      
      res.status(200).json({
        success: true,
        message: `Limpeza automática configurada: a cada ${intervalMinutes} minutos, arquivos com mais de ${maxAgeHours}h serão removidos`,
        config: {
          intervalMinutes,
          maxAgeHours,
          nextCleanup: new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Erro ao configurar limpeza automática:', error);
      
      res.status(500).json({
        success: false,
        message: 'Erro ao configurar limpeza automática',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Obtém informações do disco
   * @returns Informações do disco
   */
  private async getDiskInfo(): Promise<any> {
    try {
      // Para Windows, usa o comando dir para obter informações do disco
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('dir /-c');
      
      // Extrai informações básicas do disco
      return {
        platform: process.platform,
        uploadDir: this.uploadDir,
        message: 'Informações detalhadas do disco disponíveis via sistema operacional'
      };
    } catch (error) {
      return {
        platform: process.platform,
        uploadDir: this.uploadDir,
        error: 'Não foi possível obter informações detalhadas do disco'
      };
    }
  }

  /**
   * Obtém informações dos arquivos no diretório de upload
   * @returns Informações dos arquivos
   */
  private async getFileInfo(): Promise<any> {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        return {
          totalFiles: 0,
          totalSizeMB: 0,
          files: []
        };
      }

      const files = await readdir(this.uploadDir);
      let totalSize = 0;
      const fileDetails = [];

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        try {
          const stats = await stat(filePath);
          totalSize += stats.size;
          
          fileDetails.push({
            name: file,
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
            created: stats.birthtime,
            modified: stats.mtime,
            ageHours: ((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60)).toFixed(1)
          });
        } catch (fileError) {
          console.error(`Erro ao obter stats do arquivo ${file}:`, fileError);
        }
      }

      return {
        totalFiles: files.length,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        files: fileDetails.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
      };

    } catch (error) {
      console.error('Erro ao obter informações dos arquivos:', error);
      return {
        error: 'Não foi possível obter informações dos arquivos'
      };
    }
  }

  /**
   * Inicia limpeza automática padrão
   */
  private startAutomaticCleanup(): void {
    // Limpeza automática a cada 30 minutos, remove arquivos com mais de 1 hora
    const intervalMinutes = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '30');
    const maxAgeHours = parseInt(process.env.CLEANUP_MAX_AGE_HOURS || '1');
    
    this.cleanupInterval = setInterval(async () => {
      try {
        console.log('🔄 Executando limpeza automática');
        await this.csvService.cleanupOldFiles(maxAgeHours);
      } catch (error) {
        console.error('❌ Erro na limpeza automática:', error);
      }
    }, intervalMinutes * 60 * 1000);
    
    console.log(`🔄 Limpeza automática iniciada: a cada ${intervalMinutes} minutos, arquivos com mais de ${maxAgeHours}h serão removidos`);
  }

  /**
   * Para a limpeza automática
   */
  stopAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Limpeza automática parada');
    }
  }
}

// Instância singleton do controller
export const csvControllerOptimized = new CSVControllerOptimized();