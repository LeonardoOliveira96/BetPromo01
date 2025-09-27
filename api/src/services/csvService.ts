import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { query, transaction } from '../config/database';
import { validateCSVRow } from '../schemas/validation';
import { 
  CSVRowData, 
  InsercaoResponseDTO, 
  ImportStats,
  StagingImport 
} from '../types';
import { AppError } from '../middlewares/errorHandler';

/**
 * Serviço de importação CSV
 * Gerencia upload, processamento e importação de dados via CSV
 */
export class CSVService {
  private uploadDir: string;

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
   * Processa arquivo CSV e importa dados para o banco
   * @param file - Arquivo CSV enviado
   * @returns Resultado da importação
   */
  async processarCSV(file: Express.Multer.File): Promise<InsercaoResponseDTO> {
    const filename = file.filename;
    const filePath = path.join(this.uploadDir, filename);
    
    try {
      // Valida o arquivo
      this.validateFile(file);

      // Lê e valida dados do CSV
      const csvData = await this.readCSVFile(filePath);
      
      // Processa os dados em transação
      const stats = await this.processDataInTransaction(csvData, filename);

      // Remove arquivo temporário
      this.cleanupFile(filePath);

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
        message: `Importação concluída: ${stats.processedRows}/${stats.totalRows} registros processados`
      };

    } catch (error) {
      // Remove arquivo em caso de erro
      this.cleanupFile(filePath);
      
      console.error('Erro no processamento do CSV:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Erro interno no processamento do CSV', 500, 'CSV_PROCESSING_ERROR');
    }
  }

  /**
   * Valida o arquivo enviado
   * @param file - Arquivo para validar
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new AppError('Nenhum arquivo foi enviado', 400, 'NO_FILE');
    }

    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      throw new AppError('Arquivo deve ser do tipo CSV', 400, 'INVALID_FILE_TYPE');
    }

    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
    if (file.size > maxSize) {
      throw new AppError('Arquivo muito grande', 400, 'FILE_TOO_LARGE');
    }
  }

  /**
   * Lê e valida dados do arquivo CSV
   * @param filePath - Caminho do arquivo
   * @returns Array de dados validados
   */
  private async readCSVFile(filePath: string): Promise<CSVRowData[]> {
    return new Promise((resolve, reject) => {
      const results: CSVRowData[] = [];
      const errors: string[] = [];
      let lineNumber = 1;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          lineNumber++;
          try {
            // Se não tem promoção, adiciona uma padrão baseada na marca
            if (!data.promocao_nome) {
              const brandName = data.crm_brand_name || data.ext_brand_id || 'Marca';
              data.promocao_nome = `Promoção Padrão ${brandName}`;
              data.regras = data.regras || 'Promoção padrão para usuários da marca';
              data.data_inicio = data.data_inicio || new Date().toISOString();
              data.data_fim = data.data_fim || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 ano
            }
            
            // Valida cada linha usando Zod
            const validatedData = validateCSVRow(data);

            // Garante que promocao_nome é string (nunca undefined)
            if (!validatedData.promocao_nome) {
              validatedData.promocao_nome = '';
            }

            results.push(validatedData as CSVRowData);
          } catch (error) {
            if (error instanceof Error) {
              errors.push(`Linha ${lineNumber}: ${error.message}`);
            } else {
              errors.push(`Linha ${lineNumber}: Erro desconhecido`);
            }
          }
        })
        .on('end', () => {
          if (errors.length > 0) {
            reject(new AppError(`Erros de validação no CSV: ${errors.join(', ')}`, 400, 'CSV_VALIDATION_ERROR'));
          } else {
            resolve(results);
          }
        })
        .on('error', (error) => {
          reject(new AppError('Erro ao ler arquivo CSV', 400, 'CSV_READ_ERROR'));
        });
    });
  }

  /**
   * Processa dados em uma transação
   * @param csvData - Dados do CSV
   * @param filename - Nome do arquivo
   * @returns Estatísticas da importação
   */
  private async processDataInTransaction(csvData: CSVRowData[], filename: string): Promise<ImportStats> {
    return await transaction(async (client) => {
      const stats: ImportStats = {
        totalRows: csvData.length,
        processedRows: 0,
        newUsers: 0,
        newPromotions: 0,
        newUserPromotions: 0,
        errors: []
      };

      // 1. Insere dados na tabela staging
      await this.insertToStaging(client, csvData, filename);

      // 2. Merge na tabela usuarios_final
      stats.newUsers = await this.mergeUsuarios(client, filename);

      // 3. Cria promoções novas
      stats.newPromotions = await this.createPromocoes(client, filename);

      // 4. Vincula usuários às promoções
      stats.newUserPromotions = await this.linkUsuarioPromocoes(client, filename);

      // 5. Registra no histórico
      await this.insertHistorico(client, filename);

      // 6. Marca registros como processados
      await this.markAsProcessed(client, filename);

      stats.processedRows = csvData.length;
      return stats;
    });
  }

  /**
   * Insere dados na tabela staging usando COPY
   * @param client - Cliente da transação
   * @param csvData - Dados para inserir
   * @param filename - Nome do arquivo
   */
  private async insertToStaging(client: any, csvData: CSVRowData[], filename: string): Promise<void> {
    // Usa INSERT direto para cada linha (mais confiável que COPY FROM STDIN)
    for (const row of csvData) {
      await client.query(`
        INSERT INTO staging_import (
          smartico_user_id, user_ext_id, core_sm_brand_id, crm_brand_id,
          ext_brand_id, crm_brand_name, promocao_nome, regras,
          data_inicio, data_fim, filename
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
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
      ]);
    }
  }

  /**
   * Merge de usuários na tabela usuarios_final
   * @param client - Cliente da transação
   * @param filename - Nome do arquivo
   * @returns Número de novos usuários
   */
  private async mergeUsuarios(client: any, filename: string): Promise<number> {
    const result = await client.query(`
      INSERT INTO usuarios_final (
        smartico_user_id, user_ext_id, core_sm_brand_id, 
        crm_brand_id, ext_brand_id, crm_brand_name
      )
      SELECT DISTINCT 
        smartico_user_id, user_ext_id, core_sm_brand_id,
        crm_brand_id, ext_brand_id, crm_brand_name
      FROM staging_import 
      WHERE filename = $1
      ON CONFLICT (smartico_user_id) DO NOTHING
    `, [filename]);

    return result.rowCount || 0;
  }

  /**
   * Cria promoções novas
   * @param client - Cliente da transação
   * @param filename - Nome do arquivo
   * @returns Número de novas promoções
   */
  private async createPromocoes(client: any, filename: string): Promise<number> {
    const result = await client.query(`
      INSERT INTO promocoes (nome, regras, data_inicio, data_fim, status)
      SELECT DISTINCT 
        promocao_nome,
        regras,
        data_inicio,
        data_fim,
        'active'
      FROM staging_import 
      WHERE filename = $1 
        AND promocao_nome IS NOT NULL
        AND promocao_nome NOT IN (SELECT nome FROM promocoes)
    `, [filename]);

    return result.rowCount || 0;
  }

  /**
   * Vincula usuários às promoções
   * @param client - Cliente da transação
   * @param filename - Nome do arquivo
   * @returns Número de novos vínculos
   */
  private async linkUsuarioPromocoes(client: any, filename: string): Promise<number> {
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
      WHERE s.filename = $1
      ON CONFLICT (smartico_user_id, promocao_id) DO NOTHING
    `, [filename]);

    return result.rowCount || 0;
  }

  /**
   * Registra operações no histórico
   * @param client - Cliente da transação
   * @param filename - Nome do arquivo
   */
  private async insertHistorico(client: any, filename: string): Promise<void> {
    await client.query(`
      INSERT INTO usuario_promocao_historico (
        smartico_user_id, promocao_id, filename, status, regras,
        data_inicio, data_fim, operation_type
      )
      SELECT 
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
      WHERE s.filename = $1
    `, [filename]);
  }

  /**
   * Marca registros como processados
   * @param client - Cliente da transação
   * @param filename - Nome do arquivo
   */
  private async markAsProcessed(client: any, filename: string): Promise<void> {
    await client.query(`
      UPDATE staging_import 
      SET processed = true 
      WHERE filename = $1
    `, [filename]);
  }

  /**
   * Remove arquivo do sistema
   * @param filePath - Caminho do arquivo
   */
  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Erro ao remover arquivo:', error);
    }
  }

  /**
   * Lista arquivos importados
   * @returns Lista de importações
   */
  async listarImportacoes(): Promise<any[]> {
    try {
      const result = await query(`
        SELECT 
          filename,
          COUNT(*) as total_records,
          MIN(import_date) as import_date,
          BOOL_AND(processed) as all_processed
        FROM staging_import
        GROUP BY filename
        ORDER BY MIN(import_date) DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Erro ao listar importações:', error);
      throw new AppError('Erro interno do servidor', 500, 'IMPORT_LIST_ERROR');
    }
  }

  /**
   * Obtém detalhes de uma importação específica
   * @param filename - Nome do arquivo
   * @returns Detalhes da importação
   */
  async obterDetalhesImportacao(filename: string): Promise<any> {
    try {
      const result = await query(`
        SELECT * FROM staging_import
        WHERE filename = $1
        ORDER BY import_date DESC
      `, [filename]);

      return result.rows;
    } catch (error) {
      console.error('Erro ao obter detalhes da importação:', error);
      throw new AppError('Erro interno do servidor', 500, 'IMPORT_DETAILS_ERROR');
    }
  }
}