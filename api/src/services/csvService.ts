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
      console.log(`🚀 Iniciando processamento do CSV: ${filename}`);
      console.log(`📁 Caminho do arquivo: ${filePath}`);
      
      // Valida o arquivo
      console.log(`🔍 Validando arquivo...`);
      this.validateFile(file);
      console.log(`✅ Arquivo validado com sucesso`);

      // Lê e valida dados do CSV
      console.log(`📖 Iniciando leitura do arquivo CSV...`);
      const csvData = await this.readCSVFile(filePath);
      console.log(`📊 CSV processado: ${csvData.length} linhas válidas`);
      
      // Processa os dados em transação
      console.log(`🔄 Iniciando processamento dos dados em transação...`);
      const stats = await this.processDataInTransaction(csvData, filename);
      console.log(`✅ Processamento concluído:`, stats);

      // Remove arquivo temporário
      console.log(`🗑️ Removendo arquivo temporário...`);
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
      console.error('❌ Erro no processamento do CSV:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'Sem stack trace');
      
      // Remove arquivo em caso de erro
      console.log(`🗑️ Removendo arquivo após erro...`);
      this.cleanupFile(filePath);
      
      if (error instanceof AppError) {
        console.log(`🔄 Relançando AppError: ${error.message} (${error.errorCode})`);
        throw error;
      }
      
      console.log(`🆕 Criando novo AppError para erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
   * Processa linha CSV com formato especial (aspas duplas aninhadas)
   * @param line - Linha do CSV
   * @returns Objeto com dados parseados
   */
  private parseCustomCSVLine(line: string): any {
    // Remove aspas externas se existirem
    let cleanLine = line.trim();
    if (cleanLine.startsWith('"') && cleanLine.endsWith('"')) {
      cleanLine = cleanLine.slice(1, -1);
    }
    
    // Substitui aspas duplas escapadas por aspas simples temporariamente
    cleanLine = cleanLine.replace(/""/g, '§QUOTE§');
    
    // Divide por vírgulas, mas mantém aspas
    const parts = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < cleanLine.length; i++) {
      const char = cleanLine[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      
      current += char;
    }
    
    if (current) {
      parts.push(current.trim());
    }
    
    // Remove aspas e restaura aspas duplas
     const cleanParts = parts.map(part => {
       let clean = part.trim();
       // Remove aspas externas
       if (clean.startsWith('"') && clean.endsWith('"')) {
         clean = clean.slice(1, -1);
       }
       // Restaura aspas duplas e remove aspas extras
       clean = clean.replace(/§QUOTE§/g, '"');
       // Remove aspas duplas desnecessárias no início e fim
       if (clean.startsWith('"') && clean.endsWith('"')) {
         clean = clean.slice(1, -1);
       }
       return clean;
     });
    
    return {
      smartico_user_id: cleanParts[0] || '',
      user_ext_id: cleanParts[1] || '',
      core_sm_brand_id: cleanParts[2] || '',
      crm_brand_id: cleanParts[3] || '',
      ext_brand_id: cleanParts[4] || '',
      crm_brand_name: cleanParts[5] || ''
    };
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
      let lineNumber = 0;
      let processedLines = 0;

      console.log(`📖 Iniciando leitura do arquivo CSV: ${path.basename(filePath)}`);

      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        console.log(`📄 Arquivo lido com sucesso. Tamanho: ${fileContent.length} caracteres`);
        
        const lines = fileContent.split('\n').filter(line => line.trim());
        console.log(`📋 Total de linhas encontradas: ${lines.length}`);
        
        if (lines.length === 0) {
          throw new Error('Arquivo CSV está vazio');
        }
        
        // Pula o cabeçalho
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i]?.trim();
          if (!line) continue;
          
          lineNumber++;
          processedLines++;
          
          // Log de progresso a cada 50.000 linhas
          if (processedLines % 50000 === 0) {
            console.log(`📊 Lidas ${processedLines.toLocaleString()} linhas...`);
          }
          
          try {
            console.log(`🔍 Processando linha ${lineNumber}: ${line.substring(0, 100)}...`);
            
            // Parse customizado da linha
            const data = this.parseCustomCSVLine(line);
            console.log(`✅ Parse da linha ${lineNumber} concluído:`, JSON.stringify(data, null, 2));
            
            // Se não tem promoção, adiciona uma padrão baseada na marca
            if (!data.promocao_nome) {
              const brandName = data.crm_brand_name || data.ext_brand_id || 'Marca';
              data.promocao_nome = `Promoção Padrão ${brandName}`;
              data.regras = data.regras || 'Promoção padrão para usuários da marca';
              data.data_inicio = data.data_inicio || new Date().toISOString();
              data.data_fim = data.data_fim || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 ano
              console.log(`🔧 Dados padrão adicionados para linha ${lineNumber}:`, JSON.stringify(data, null, 2));
            }
            
            // Valida cada linha usando Zod
            console.log(`🔍 Validando linha ${lineNumber} com Zod...`);
            const validatedData = validateCSVRow(data);
            console.log(`✅ Validação Zod concluída para linha ${lineNumber}`);

            // Garante que promocao_nome é string (nunca undefined)
            if (!validatedData.promocao_nome) {
              validatedData.promocao_nome = '';
            }

            results.push(validatedData as CSVRowData);
          } catch (error) {
          if (error instanceof Error) {
            errors.push(`Linha ${lineNumber + 1}: ${error.message}`);
          } else {
            errors.push(`Linha ${lineNumber + 1}: Erro desconhecido`);
          }
        }
      }
      
      console.log(`✅ Leitura concluída: ${processedLines.toLocaleString()} linhas processadas`);
      
      if (errors.length > 0) {
        reject(new AppError(`Erros de validação no CSV: ${errors.join(', ')}`, 400, 'CSV_VALIDATION_ERROR'));
      } else {
        resolve(results);
      }
      
      } catch (fileError) {
        console.error('❌ Erro na leitura do arquivo CSV:', fileError);
        reject(new AppError(`Erro na leitura do arquivo CSV: ${fileError instanceof Error ? fileError.message : 'Erro desconhecido'}`, 500, 'CSV_FILE_READ_ERROR'));
      }
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
    const batchSize = 5000; // Processa 5000 registros por vez para máxima performance
    const totalRows = csvData.length;
    
    console.log(`🚀 Iniciando inserção em lote de ${totalRows} registros (${batchSize} por lote)`);
    
    for (let i = 0; i < totalRows; i += batchSize) {
      const batch = csvData.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(totalRows / batchSize);
      
      console.log(`📦 Processando lote ${currentBatch}/${totalBatches} (${batch.length} registros)`);
      
      // Constrói query com múltiplos VALUES
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
      
      // Log de progresso a cada 10 lotes
      if (currentBatch % 10 === 0 || currentBatch === totalBatches) {
        const progress = ((i + batch.length) / totalRows * 100).toFixed(1);
        console.log(`✅ Progresso: ${progress}% (${i + batch.length}/${totalRows} registros)`);
      }
    }
    
    console.log(`🎉 Inserção concluída: ${totalRows} registros inseridos com sucesso!`);
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
      SELECT 
        promocao_nome,
        MAX(regras) as regras,
        MIN(data_inicio) as data_inicio,
        MAX(data_fim) as data_fim,
        'active'
      FROM staging_import 
      WHERE filename = $1 
        AND promocao_nome IS NOT NULL
      GROUP BY promocao_nome
      ON CONFLICT (nome) DO UPDATE SET
        regras = COALESCE(EXCLUDED.regras, promocoes.regras),
        data_inicio = COALESCE(EXCLUDED.data_inicio, promocoes.data_inicio),
        data_fim = COALESCE(EXCLUDED.data_fim, promocoes.data_fim),
        updated_at = NOW()
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
      SELECT 
        s.smartico_user_id,
        p.promocao_id,
        MIN(s.data_inicio) as data_inicio,
        MAX(s.data_fim) as data_fim,
        MAX(s.regras) as regras,
        'active'
      FROM staging_import s
      JOIN promocoes p ON s.promocao_nome = p.nome
      WHERE s.filename = $1
      GROUP BY s.smartico_user_id, p.promocao_id
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