import fs from 'fs';
import csv from 'csv-parser';
import { PromotionUser, IPromotionUser } from '../models/PromotionUser';
import mongoose from 'mongoose';
import { EventEmitter } from 'events';

export interface CSVRow {
  smartico_user_id: string;
  user_ext_id: string;
  core_sm_brand_id: string;
  crm_brand_id: string;
  ext_brand_id: string;
  crm_brand_name: string;
}

export interface ProcessingResult {
  totalRows: number;
  processedRows: number;
  newUsers: number;
  updatedUsers: number;
  errors: string[];
  processingTime: number;
  filename: string;
  promotionId: string;
}

export class CSVProcessor extends EventEmitter {
  private batchSize: number = 5000;
  private currentBatch: any[] = [];
  private stats = {
    totalRows: 0,
    processedRows: 0,
    newUsers: 0,
    updatedUsers: 0,
    errors: [] as string[],
  };

  constructor(batchSize: number = 5000) {
    super();
    this.batchSize = batchSize;
  }

  /**
   * Processa um arquivo CSV de forma eficiente usando streaming
   */
  async processCSV(
    filePath: string, 
    filename: string, 
    promotionId: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    this.resetStats();

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }) => header.trim().toLowerCase()
        }));

      stream.on('data', async (row: CSVRow) => {
        try {
          // Pausa o stream para processar o batch
          stream.pause();
          
          await this.addRowToBatch(row, filename, promotionId);
          
          // Emite evento de progresso a cada 100 linhas
          if (this.stats.totalRows % 100 === 0) {
            this.emit('progress', {
              totalRows: this.stats.totalRows,
              processedRows: this.stats.processedRows,
              percentage: this.stats.totalRows > 0 ? (this.stats.processedRows / this.stats.totalRows) * 100 : 0,
              currentBatchSize: this.currentBatch.length
            });
          }
          
          // Resume o stream
          stream.resume();
        } catch (error) {
          this.stats.errors.push(`Erro na linha ${this.stats.totalRows}: ${error}`);
          stream.resume();
        }
      });

      stream.on('end', async () => {
        try {
          // Processa o último batch se houver dados
          if (this.currentBatch.length > 0) {
            await this.processBatch(filename, promotionId);
          }

          const processingTime = Date.now() - startTime;
          
          resolve({
            totalRows: this.stats.totalRows,
            processedRows: this.stats.processedRows,
            newUsers: this.stats.newUsers,
            updatedUsers: this.stats.updatedUsers,
            errors: this.stats.errors,
            processingTime,
            filename,
            promotionId,
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Adiciona uma linha ao batch atual
   */
  private async addRowToBatch(row: CSVRow, filename: string, promotionId: string): Promise<void> {
    this.stats.totalRows++;

    // Valida os dados da linha
    const validationError = this.validateRow(row);
    if (validationError) {
      this.stats.errors.push(`Linha ${this.stats.totalRows}: ${validationError}`);
      return;
    }

    // Converte os dados para o formato correto
    const userData = {
      smartico_user_id: parseInt(row.smartico_user_id),
      user_ext_id: row.user_ext_id.trim(),
      core_sm_brand_id: parseInt(row.core_sm_brand_id),
      crm_brand_id: parseInt(row.crm_brand_id),
      ext_brand_id: row.ext_brand_id.trim(),
      crm_brand_name: row.crm_brand_name.trim(),
      filename,
      promotionId,
    };

    this.currentBatch.push(userData);

    // Processa o batch quando atingir o tamanho limite
    if (this.currentBatch.length >= this.batchSize) {
      await this.processBatch(filename, promotionId);
    }
  }

  /**
   * Processa um batch de dados usando bulk operations
   */
  private async processBatch(filename: string, promotionId: string): Promise<void> {
    if (this.currentBatch.length === 0) return;
    
    try {
      const bulkOps = [];

      for (const userData of this.currentBatch) {
        const { smartico_user_id, filename: file, promotionId: promo, ...userFields } = userData;

        // Validação dos dados antes de criar a operação
        if (!smartico_user_id || smartico_user_id === '') {
          console.error('smartico_user_id inválido:', smartico_user_id, 'userData:', userData);
          this.stats.errors.push(`smartico_user_id inválido: ${smartico_user_id}`);
          continue;
        }

        // Converte smartico_user_id para número se for string
        const smarticoUserIdNumber = typeof smartico_user_id === 'string' ? 
          parseInt(smartico_user_id, 10) : smartico_user_id;

        if (isNaN(smarticoUserIdNumber)) {
          console.error('smartico_user_id não é um número válido:', smartico_user_id);
          this.stats.errors.push(`smartico_user_id não é um número válido: ${smartico_user_id}`);
          continue;
        }

        // Operação de upsert otimizada - sem consultas prévias
        bulkOps.push({
          updateOne: {
            filter: { smartico_user_id: smarticoUserIdNumber },
            update: [
              {
                $set: {
                  smartico_user_id: smarticoUserIdNumber,
                  user_ext_id: userFields.user_ext_id,
                  core_sm_brand_id: userFields.core_sm_brand_id,
                  crm_brand_id: userFields.crm_brand_id,
                  ext_brand_id: userFields.ext_brand_id,
                  crm_brand_name: userFields.crm_brand_name,
                  current_promotions: {
                    $cond: {
                      if: { $eq: [{ $type: "$current_promotions" }, "missing"] },
                      then: [promo],
                      else: {
                        $setUnion: ["$current_promotions", [promo]]
                      }
                    }
                  },
                  promotion_history: {
                    $cond: {
                      if: { $eq: [{ $type: "$promotion_history" }, "missing"] },
                      then: [{
                        promotion_id: promo,
                        filename: file,
                        added_date: new Date(),
                        status: 'active',
                      }],
                      else: {
                        $concatArrays: [
                          "$promotion_history",
                          [{
                            promotion_id: promo,
                            filename: file,
                            added_date: new Date(),
                            status: 'active',
                          }]
                        ]
                      }
                    }
                  },
                  file_history: {
                    $cond: {
                      if: { $eq: [{ $type: "$file_history" }, "missing"] },
                      then: [{
                        filename: file,
                        uploaded_date: new Date(),
                        promotion_id: promo,
                      }],
                      else: {
                        $concatArrays: [
                          "$file_history",
                          [{
                            filename: file,
                            uploaded_date: new Date(),
                            promotion_id: promo,
                          }]
                        ]
                      }
                    }
                  },
                  created_at: {
                    $cond: {
                      if: { $eq: [{ $type: "$created_at" }, "missing"] },
                      then: new Date(),
                      else: "$created_at"
                    }
                  },
                  updated_at: new Date(),
                }
              }
            ],
            upsert: true,
          },
        });
      }

      if (bulkOps.length === 0) {
        console.log('Nenhuma operação válida para processar neste batch');
        return;
      }

      console.log(`Processando batch com ${bulkOps.length} operações`);

      // Executa as operações em bulk sem transação
      const result = await PromotionUser.bulkWrite(bulkOps, { 
        ordered: false // Permite continuar mesmo se algumas operações falharem
      });

      console.log('Resultado do bulkWrite:', {
        insertedCount: result.insertedCount,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        deletedCount: result.deletedCount
      });

      // Atualiza estatísticas
      this.stats.processedRows += this.currentBatch.length;
      this.stats.newUsers += result.upsertedCount || 0;
      this.stats.updatedUsers += result.modifiedCount || 0;

      // Emite evento de progresso após processar o batch
      this.emit('progress', {
        totalRows: this.stats.totalRows,
        processedRows: this.stats.processedRows,
        percentage: this.stats.totalRows > 0 ? (this.stats.processedRows / this.stats.totalRows) * 100 : 0,
        newUsers: this.stats.newUsers,
        updatedUsers: this.stats.updatedUsers,
        batchProcessed: this.currentBatch.length
      });
    } catch (error: any) {
      console.error('Erro detalhado ao processar batch:', error);
      
      // Se for um erro de bulkWrite, vamos analisar os erros individuais
      if (error.writeErrors && error.writeErrors.length > 0) {
        console.error('WriteErrors encontrados:');
        error.writeErrors.slice(0, 5).forEach((writeError: any, index: number) => {
          console.error(`WriteError ${index + 1}:`, {
            index: writeError.index,
            code: writeError.code,
            errmsg: writeError.errmsg,
            op: writeError.getOperation ? writeError.getOperation() : 'N/A'
          });
        });
        this.stats.errors.push(`${error.writeErrors.length} WriteErrors encontrados. Primeiro erro: ${error.writeErrors[0].errmsg}`);
      } else {
        this.stats.errors.push(`Erro ao processar batch: ${error.message || error}`);
      }
    } finally {
      this.currentBatch = []; // Limpa o batch atual
    }
  }

  /**
   * Valida uma linha do CSV
   */
  private validateRow(row: CSVRow): string | null {
    if (!row.smartico_user_id || isNaN(parseInt(row.smartico_user_id))) {
      return 'smartico_user_id inválido ou ausente';
    }

    if (!row.user_ext_id || !row.user_ext_id.trim()) {
      return 'user_ext_id inválido ou ausente';
    }

    if (!row.core_sm_brand_id || isNaN(parseInt(row.core_sm_brand_id))) {
      return 'core_sm_brand_id inválido ou ausente';
    }

    if (!row.crm_brand_id || isNaN(parseInt(row.crm_brand_id))) {
      return 'crm_brand_id inválido ou ausente';
    }

    if (!row.ext_brand_id || !row.ext_brand_id.trim()) {
      return 'ext_brand_id inválido ou ausente';
    }

    if (!row.crm_brand_name || !row.crm_brand_name.trim()) {
      return 'crm_brand_name inválido ou ausente';
    }

    return null;
  }

  /**
   * Reseta as estatísticas para um novo processamento
   */
  private resetStats(): void {
    this.stats = {
      totalRows: 0,
      processedRows: 0,
      newUsers: 0,
      updatedUsers: 0,
      errors: [],
    };
    this.currentBatch = [];
  }

  /**
   * Busca usuários em uma promoção específica
   */
  static async findUsersInPromotion(
    promotionId: string, 
    page: number = 1, 
    limit: number = 100
  ): Promise<{
    users: IPromotionUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      PromotionUser.find({ current_promotions: promotionId })
        .skip(skip)
        .limit(limit)
        .lean(),
      PromotionUser.countDocuments({ current_promotions: promotionId })
    ]);

    return {
      users: users as IPromotionUser[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Verifica se um usuário específico está em uma promoção
   */
  static async isUserInPromotion(
    smarticoUserId: number, 
    promotionId: string
  ): Promise<boolean> {
    const user = await PromotionUser.findOne({
      smartico_user_id: smarticoUserId,
      current_promotions: promotionId,
    }).lean();

    return !!user;
  }

  /**
   * Obtém estatísticas de uma promoção
   */
  static async getPromotionStats(promotionId: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    files: string[];
  }> {
    const [totalUsers, activeUsers, inactiveUsers, filesResult] = await Promise.all([
      PromotionUser.countDocuments({
        'promotion_history.promotion_id': promotionId
      }),
      PromotionUser.countDocuments({
        current_promotions: promotionId
      }),
      PromotionUser.countDocuments({
        'promotion_history.promotion_id': promotionId,
        'promotion_history.status': 'inactive'
      }),
      PromotionUser.distinct('file_history.filename', {
        'file_history.promotion_id': promotionId
      })
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      files: filesResult,
    };
  }
}