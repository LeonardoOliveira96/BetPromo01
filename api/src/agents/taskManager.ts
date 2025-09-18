import cron from 'node-cron';
import { AgentTask, IAgentTask } from '../models/AgentTask';

export class TaskManager {
  private static instance: TaskManager;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }

  public async initialize(): Promise<void> {
    console.log('🤖 Inicializando Task Manager...');
    
    // Agenda execução a cada minuto
    cron.schedule('* * * * *', async () => {
      if (!this.isRunning) {
        await this.processPendingTasks();
      }
    });

    console.log('✅ Task Manager inicializado');
  }

  private async processPendingTasks(): Promise<void> {
    this.isRunning = true;
    
    try {
      // Busca tarefas pendentes
      const tasks = await AgentTask.find({
        status: 'pending',
        scheduledFor: { $lte: new Date() },
      })
        .sort({ priority: -1, scheduledFor: 1 })
        .limit(10);

      if (tasks.length === 0) {
        this.isRunning = false;
        return;
      }

      console.log(`📋 Processando ${tasks.length} tarefas pendentes...`);

      // Processa cada tarefa
      for (const task of tasks) {
        await this.processTask(task);
      }
    } catch (error) {
      console.error('❌ Erro ao processar tarefas:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processTask(task: IAgentTask): Promise<void> {
    try {
      await task.startProcessing('TaskManager');

      let result: any;
      
      switch (task.type) {
        case 'promotion_notification':
          result = await this.processPromotionNotification(task);
          break;
        case 'usage_validation':
          result = await this.processUsageValidation(task);
          break;
        case 'report_generation':
          result = await this.processReportGeneration(task);
          break;
        case 'cleanup':
          result = await this.processCleanup(task);
          break;
        case 'analytics':
          result = await this.processAnalytics(task);
          break;
        default:
          throw new Error(`Tipo de tarefa não suportado: ${task.type}`);
      }

      await task.complete(result);
      console.log(`✅ Tarefa ${task.id} (${task.type}) concluída com sucesso`);
    } catch (error: any) {
      console.error(`❌ Erro ao processar tarefa ${task.id}:`, error.message);
      await task.fail(error.message);
    }
  }

  private async processPromotionNotification(task: IAgentTask): Promise<any> {
    const { promotionId, userIds, message } = task.data;
    
    // Simula envio de notificações
    console.log(`📧 Enviando notificação de promoção ${promotionId} para ${userIds.length} usuários`);
    
    // Aqui você implementaria a lógica real de envio de notificações
    // Por exemplo: email, push notifications, SMS, etc.
    
    return {
      sent: userIds.length,
      message: 'Notificações enviadas com sucesso',
    };
  }

  private async processUsageValidation(task: IAgentTask): Promise<any> {
    const { usageId, conditions } = task.data;
    
    console.log(`🔍 Validando uso de promoção ${usageId}`);
    
    // Simula validação de condições
    const isValid = Math.random() > 0.1; // 90% de chance de ser válido
    
    return {
      usageId,
      isValid,
      validatedAt: new Date(),
      conditions,
    };
  }

  private async processReportGeneration(task: IAgentTask): Promise<any> {
    const { reportType, dateRange, filters } = task.data;
    
    console.log(`📊 Gerando relatório ${reportType} para período ${dateRange.start} - ${dateRange.end}`);
    
    // Simula geração de relatório
    const reportData = {
      type: reportType,
      period: dateRange,
      filters,
      generatedAt: new Date(),
      data: {
        totalPromotions: Math.floor(Math.random() * 100),
        totalUsages: Math.floor(Math.random() * 1000),
        totalRewards: Math.floor(Math.random() * 50000),
      },
    };
    
    return reportData;
  }

  private async processCleanup(task: IAgentTask): Promise<any> {
    const { type, olderThan } = task.data;
    
    console.log(`🧹 Executando limpeza ${type} para dados anteriores a ${olderThan}`);
    
    let deletedCount = 0;
    
    switch (type) {
      case 'expired_tasks':
        const expiredTasks = await AgentTask.deleteMany({
          status: { $in: ['completed', 'failed'] },
          completedAt: { $lt: new Date(olderThan) },
        });
        deletedCount = expiredTasks.deletedCount || 0;
        break;
      case 'old_logs':
        // Implementar limpeza de logs
        deletedCount = Math.floor(Math.random() * 50);
        break;
    }
    
    return {
      type,
      deletedCount,
      cleanedAt: new Date(),
    };
  }

  private async processAnalytics(task: IAgentTask): Promise<any> {
    const { metrics, period } = task.data;
    
    console.log(`📈 Processando analytics para métricas: ${metrics.join(', ')}`);
    
    // Simula processamento de analytics
    const analyticsData = {
      period,
      metrics: metrics.reduce((acc: any, metric: string) => {
        acc[metric] = Math.floor(Math.random() * 1000);
        return acc;
      }, {}),
      processedAt: new Date(),
    };
    
    return analyticsData;
  }

  // Métodos públicos para criar tarefas
  public async createPromotionNotificationTask(
    promotionId: string,
    userIds: string[],
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<IAgentTask> {
    const task = new AgentTask({
      type: 'promotion_notification',
      priority,
      data: { promotionId, userIds, message },
    });
    
    return task.save();
  }

  public async createUsageValidationTask(
    usageId: string,
    conditions: any,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'high'
  ): Promise<IAgentTask> {
    const task = new AgentTask({
      type: 'usage_validation',
      priority,
      data: { usageId, conditions },
    });
    
    return task.save();
  }

  public async createReportGenerationTask(
    reportType: string,
    dateRange: { start: Date; end: Date },
    filters: any = {},
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'low'
  ): Promise<IAgentTask> {
    const task = new AgentTask({
      type: 'report_generation',
      priority,
      data: { reportType, dateRange, filters },
    });
    
    return task.save();
  }

  public async createCleanupTask(
    type: string,
    olderThan: Date,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'low'
  ): Promise<IAgentTask> {
    const task = new AgentTask({
      type: 'cleanup',
      priority,
      data: { type, olderThan },
      scheduledFor: new Date(Date.now() + 60000), // Agenda para 1 minuto no futuro
    });
    
    return task.save();
  }

  public async createAnalyticsTask(
    metrics: string[],
    period: { start: Date; end: Date },
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<IAgentTask> {
    const task = new AgentTask({
      type: 'analytics',
      priority,
      data: { metrics, period },
    });
    
    return task.save();
  }
}

// Função utilitária para criar tarefas
export async function createAgentTask(
  type: 'promotion_notification' | 'usage_validation' | 'report_generation' | 'cleanup' | 'analytics',
  data: any,
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
): Promise<IAgentTask> {
  const task = new AgentTask({
    type,
    priority,
    data,
  });
  
  return task.save();
}