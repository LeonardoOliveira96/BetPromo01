import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { AppError } from '../middlewares/errorHandler';
import { query, transaction } from '../config/database';
import { CSVRowData, InsercaoResponseDTO, ImportStats } from '../types';

/**
 * Serviço de importação CSV OTIMIZADO
 * Versão melhorada para lidar com grandes volumes de dados e otimizar espaço em disco
 */
export class CSVServiceOptimized {
  private uploadDir: string;
  private readonly BATCH_SIZE = 10000; // Aumentado para melhor performance
  private readonly MAX_MEMORY_ROWS = 50000; // Processa em chunks para economizar memória

  constructor() {
    this.uploadDir = process.env.UPLOAD_PATH || './uploads';
    this.ensureUploadDir();
  }

  /**
   * Garante que o diretório de upload existe
   */
  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Processa arquivo CSV de forma otimizada com streaming
   * @param file - Arquivo CSV enviado
   * @returns Resultado da importação
   */
  async processarCSVOtimizado(file: Express.Multer.File): Promise<InsercaoResponseDTO> {
    const filename = file.filename;
    const filePath = path.join(this.uploadDir, filename);
    
    try {
      console.log(`🚀 Iniciando processamento otimizado do arquivo: ${filename}`);
      console.log(`📊 Tamanho do arquivo: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Valida o arquivo
      this.validateFile(file);

      // Processa arquivo em streaming para economizar memória
      const stats = await this.processFileInStreaming(filePath, filename);

      // Remove arquivo IMEDIATAMENTE após processamento para economizar espaço
      this.cleanupFile(filePath);
      console.log(`🗑️ Arquivo ${filename} removido para economizar espaço em disco`);

      return {
        success: true,
        data: {
          filename,
          totalRows: stats.totalRows,
          processedRows: stats.processedRows,
          newUsers: stats.newUsers,
          newPromotions: stats.newPromotions,
          newUserPromotions: stats.newUserPromotions,
          errors: stats.errors
        },
        message: `Importação otimizada concluída: ${stats.processedRows}/${stats.totalRows} registros processados`
      };

    } catch (error) {
      // Remove arquivo em caso de erro
      this.cleanupFile(filePath);
      
      console.error('❌ Erro no processamento otimizado do CSV:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Erro interno no processamento otimizado do CSV', 500, 'CSV_PROCESSING_ERROR');
    }
  }

  /**
   * Processa arquivo em streaming para economizar memória
   * @param filePath - Caminho do arquivo
   * @param filename - Nome do arquivo
   * @returns Estatísticas da importação
   */
  private async processFileInStreaming(filePath: string, filename: string): Promise<ImportStats> {
    return new Promise((resolve, reject) => {
      const stats: ImportStats = {
        totalRows: 0,
        processedRows: 0,
        newUsers: 0,
        newPromotions: 0,
        newUserPromotions: 0,
        errors: []
      };

      let currentBatch: CSVRowData[] = [];
      let batchNumber = 1;
      let isProcessing = false;

      const stream = fs.createReadStream(filePath)
        .pipe(csv({
          separator: ','
        }));

      stream.on('data', async (row: any) => {
        try {
          // Pausa o stream para processar o batch
          if (!isProcessing) {
            stream.pause();
            isProcessing = true;

            const csvRow = this.parseCSVRow(row);
            currentBatch.push(csvRow);
            stats.totalRows++;

            // Processa batch quando atinge o tamanho máximo
            if (currentBatch.length >= this.BATCH_SIZE) {
              console.log(`📦 Processando batch ${batchNumber} (${currentBatch.length} registros)`);
              
              try {
                const batchStats = await this.processBatchOptimized(currentBatch, filename);
                this.mergeBatchStats(stats, batchStats);
                
                currentBatch = [];
                batchNumber++;
                
                // Log de progresso
                const progress = ((stats.processedRows / stats.totalRows) * 100).toFixed(1);
                console.log(`✅ Progresso: ${progress}% (${stats.processedRows}/${stats.totalRows} registros)`);
              } catch (batchError) {
                console.error('Erro no processamento do batch:', batchError);
                stats.errors.push(`Erro no batch ${batchNumber}: ${batchError}`);
              }
            }

            isProcessing = false;
            // Resume o stream
            stream.resume();
          }
        } catch (error) {
          console.error('Erro ao processar linha:', error);
          stats.errors.push(`Erro na linha ${stats.totalRows}: ${error}`);
          isProcessing = false;
          stream.resume();
        }
      });

      stream.on('end', async () => {
        try {
          // Processa o último batch se houver dados restantes
          if (currentBatch.length > 0) {
            console.log(`📦 Processando batch final ${batchNumber} (${currentBatch.length} registros)`);
            const batchStats = await this.processBatchOptimized(currentBatch, filename);
            this.mergeBatchStats(stats, batchStats);
          }

          console.log(`🎉 Processamento concluído: ${stats.totalRows} linhas lidas, ${stats.processedRows} processadas`);
          resolve(stats);
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', (error) => {
        console.error('❌ Erro no stream de leitura:', error);
        reject(error);
      });
    });
  }

  /**
   * Processa um batch de dados de forma otimizada
   * @param batch - Dados do batch
   * @param filename - Nome do arquivo
   * @returns Estatísticas do batch
   */
  private async processBatchOptimized(batch: CSVRowData[], filename: string): Promise<ImportStats> {
    return await transaction(async (client) => {
      const batchStats: ImportStats = {
        totalRows: batch.length,
        processedRows: 0,
        newUsers: 0,
        newPromotions: 0,
        newUserPromotions: 0,
        errors: []
      };

      try {
        // 1. Inserção otimizada na staging usando INSERT em lote
        await this.insertToStagingOptimized(client, batch, filename);

        // 2. Merge otimizado na tabela usuarios_final
        batchStats.newUsers = await this.mergeUsuariosOptimized(client, filename);

        // 3. Cria promoções novas de forma otimizada
        batchStats.newPromotions = await this.createPromocoesOptimized(client, filename);

        // 4. Vincula usuários às promoções de forma otimizada
        batchStats.newUserPromotions = await this.linkUsuarioPromocoesOptimized(client, filename);

        // 5. Registra no histórico de forma otimizada
        await this.insertHistoricoOptimized(client, filename);

        // 6. Remove dados processados da staging para economizar espaço
        await this.cleanupStagingData(client, filename);

        batchStats.processedRows = batch.length;
        return batchStats;

      } catch (error) {
        console.error('❌ Erro no processamento do batch:', error);
        batchStats.errors.push(`Erro no batch: ${error}`);
        return batchStats;
      }
    });
  }

  /**
   * Inserção otimizada na staging usando INSERT em lote
   * @param client - Cliente da transação
   * @param batch - Dados do batch
   * @param filename - Nome do arquivo
   */
  private async insertToStagingOptimized(client: any, batch: CSVRowData[], filename: string): Promise<void> {
    // Constrói query com múltiplos VALUES para inserção em lote
    const values: any[] = [];
    const placeholders: string[] = [];
    
    batch.forEach((row, index) => {
      const baseIndex = index * 11;
      placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11})`);
      
      values.push(
        row.smartico_user_id,
        row.user_ext_id,
        row.core_sm_brand_id,
        row.crm_brand_id,
        row.ext_brand_id,
        row.crm_brand_name,
        row.promocao_nome,
        row.regras,
        row.data_inicio,
        row.data_fim,
        filename
      );
    });
    
    const query = `
      INSERT INTO staging_import (
        smartico_user_id, user_ext_id, core_sm_brand_id, crm_brand_id,
        ext_brand_id, crm_brand_name, promocao_nome, regras,
        data_inicio, data_fim, filename
      ) VALUES ${placeholders.join(', ')}
    `;
    
    await client.query(query, values);
  }

  /**
   * Merge otimizado de usuários
   * @param client - Cliente da transação
   * @param filename - Nome do arquivo
   * @returns Número de novos usuários
   */
  private async mergeUsuariosOptimized(client: any, filename: string): Promise<number> {
    const result = await client.query(`
      INSERT INTO usuarios_final (
        smartico_user_id, user_ext_id, core_sm_brand_id, 
        crm_brand_id, ext_brand_id, crm_brand_name
      )
      SELECT DISTINCT 
        smartico_user_id, user_ext_id, core_sm_brand_id,
        crm_brand_id, ext_brand_id, crm_brand_name
      FROM staging_import 
      WHERE filename = $1 AND processed = false
      ON CONFLICT (smartico_user_id) DO UPDATE SET
        user_ext_id = COALESCE(EXCLUDED.user_ext_id, usuarios_final.user_ext_id),
        core_sm_brand_id = COALESCE(EXCLUDED.core_sm_brand_id, usuarios_final.core_sm_brand_id),
        crm_brand_id = COALESCE(EXCLUDED.crm_brand_id, usuarios_final.crm_brand_id),
        ext_brand_id = COALESCE(EXCLUDED.ext_brand_id, usuarios_final.ext_brand_id),
        crm_brand_name = COALESCE(EXCLUDED.crm_brand_name, usuarios_final.crm_brand_name),
        updated_at = NOW()
    `, [filename]);

    return result.rowCount || 0;
  }

  /**
   * Criação otimizada de promoções
   * @param client - Cliente da transação
   * @param filename - Nome do arquivo
   * @returns Número de novas promoções
   */
  private async createPromocoesOptimized(client: any, filename: string): Promise<number> {
    const result = await client.query(`
      INSERT INTO promocoes (nome, regras, data_inicio, data_fim, status)
      SELECT DISTINCT 
        promocao_nome,
        regras,
        data_inicio,
        data_fim,
        'active'
      FROM staging_import 
      WHERE filename = $1 AND processed = false
        AND promocao_nome IS NOT NULL
      ON CONFLICT (nome) DO UPDATE SET
        regras = COALESCE(EXCLUDED.regras, promocoes.regras),
        data_inicio = COALESCE(EXCLUDED.data_inicio, promocoes.data_inicio),
        data_fim = COALESCE(EXCLUDED.data_fim, promocoes.data_fim),
        updated_at = NOW()
    `, [filename]);

    return result.rowCount || 0;
  }

  /**
   * Vinculação otimizada de usuários às promoções
   * @param client - Cliente da transação
   * @param filename - Nome do arquivo
   * @returns Número de novos vínculos
   */
  private async linkUsuarioPromocoesOptimized(client: any, filename: string): Promise<number> {
    const result = await client.query(`
      INSERT INTO usuario_promocao (
        smartico_user_id, promocao_id, data_inicio, data_fim, regras, status
      )
      SELECT DISTINCT
        s.smartico_user_id,
        p.promocao_id,
        s.data_inicio,
        s.data_fim,
        s.regras,
        'active'
      FROM staging_import s
      JOIN promocoes p ON s.promocao_nome = p.nome
      WHERE s.filename = $1 AND s.processed = false
      ON CONFLICT (smartico_user_id, promocao_id) DO UPDATE SET
        data_inicio = COALESCE(EXCLUDED.data_inicio, usuario_promocao.data_inicio),
        data_fim = COALESCE(EXCLUDED.data_fim, usuario_promocao.data_fim),
        regras = COALESCE(EXCLUDED.regras, usuario_promocao.regras),
        updated_at = NOW()
    `, [filename]);

    return result.rowCount || 0;
  }

  /**
   * Inserção otimizada no histórico
   * @param client - Cliente da transação
   * @param filename - Nome do arquivo
   */
  private async insertHistoricoOptimized(client: any, filename: string): Promise<void> {
    await client.query(`
      INSERT INTO usuario_promocao_historico (
        smartico_user_id, promocao_id, filename, status, regras,
        data_inicio, data_fim, operation_type
      )
      SELECT DISTINCT
        s.smartico_user_id,
        p.promocao_id,
        s.filename,
        'active',
        s.regras,
        s.data_inicio,
        s.data_fim,
        'insert'
      FROM staging_import s
      JOIN promocoes p ON s.promocao_nome = p.nome
      WHERE s.filename = $1 AND s.processed = false
    `, [filename]);
  }

  /**
   * Remove dados processados da staging para economizar espaço
   * @param client - Cliente da transação
   * @param filename - Nome do arquivo
   */
  private async cleanupStagingData(client: any, filename: string): Promise<void> {
    await client.query(`
      DELETE FROM staging_import 
      WHERE filename = $1
    `, [filename]);
    
    console.log(`🗑️ Dados da staging removidos para economizar espaço: ${filename}`);
  }

  /**
   * Combina estatísticas de batches
   * @param mainStats - Estatísticas principais
   * @param batchStats - Estatísticas do batch
   */
  private mergeBatchStats(mainStats: ImportStats, batchStats: ImportStats): void {
    mainStats.processedRows += batchStats.processedRows;
    mainStats.newUsers += batchStats.newUsers;
    mainStats.newPromotions += batchStats.newPromotions;
    mainStats.newUserPromotions += batchStats.newUserPromotions;
    mainStats.errors.push(...batchStats.errors);
  }

  /**
   * Converte linha do CSV para objeto tipado
   * @param row - Linha do CSV
   * @returns Objeto CSVRowData
   */
  private parseCSVRow(row: any): CSVRowData {
    return {
      smartico_user_id: parseInt(row.smartico_user_id) || 0,
      user_ext_id: row.user_ext_id || undefined,
      core_sm_brand_id: row.core_sm_brand_id !== undefined && row.core_sm_brand_id !== null && row.core_sm_brand_id !== '' ? parseInt(row.core_sm_brand_id) : undefined,
      crm_brand_id: row.crm_brand_id !== undefined && row.crm_brand_id !== null && row.crm_brand_id !== '' ? parseInt(row.crm_brand_id) : undefined,
      ext_brand_id: row.ext_brand_id || undefined,
      crm_brand_name: row.crm_brand_name || undefined,
      promocao_nome: row.promocao_nome || '',
      regras: row.regras || undefined,
      data_inicio: row.data_inicio ? new Date(row.data_inicio) : undefined,
      data_fim: row.data_fim ? new Date(row.data_fim) : undefined
    };
  }

  /**
   * Valida arquivo enviado
   * @param file - Arquivo para validar
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new AppError('Nenhum arquivo foi enviado', 400, 'NO_FILE');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new AppError('Apenas arquivos CSV são permitidos', 400, 'INVALID_FILE_TYPE');
    }

    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB
    if (file.size > maxSize) {
      throw new AppError('Arquivo muito grande', 400, 'FILE_TOO_LARGE');
    }
  }

  /**
   * Remove arquivo do sistema
   * @param filePath - Caminho do arquivo
   */
  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Arquivo removido: ${filePath}`);
      }
    } catch (error) {
      console.error('❌ Erro ao remover arquivo:', error);
    }
  }

  /**
   * Limpa arquivos antigos do diretório de upload
   * @param maxAgeHours - Idade máxima em horas (padrão: 1 hora)
   */
  async cleanupOldFiles(maxAgeHours: number = 1): Promise<void> {
    try {
      const files = fs.readdirSync(this.uploadDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Converte para milissegundos
      let removedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          removedCount++;
          console.log(`🗑️ Arquivo antigo removido: ${file}`);
        }
      }

      console.log(`🧹 Limpeza concluída: ${removedCount} arquivos removidos`);
    } catch (error) {
      console.error('❌ Erro ao limpar arquivos antigos:', error);
    }
  }
}