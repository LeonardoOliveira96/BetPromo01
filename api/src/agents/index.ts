import { TaskManager } from './taskManager';

export { TaskManager };

// Instância global do TaskManager
let taskManagerInstance: TaskManager | null = null;

export const initializeAgents = async (): Promise<void> => {
  try {
    console.log('🤖 Inicializando sistema de agents...');
    
    // Inicializa o TaskManager
    taskManagerInstance = TaskManager.getInstance();
    await taskManagerInstance.initialize();
    
    // Removido o agendamento de tarefas automáticas para evitar erro de autenticação
    // await scheduleAutomaticTasks();
    
    console.log('✅ Sistema de agents inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar agents:', error);
    throw error;
  }
};

export const getTaskManager = (): TaskManager => {
  if (!taskManagerInstance) {
    throw new Error('TaskManager não foi inicializado. Chame initializeAgents() primeiro.');
  }
  return taskManagerInstance;
};

// Agenda tarefas automáticas do sistema
const scheduleAutomaticTasks = async (): Promise<void> => {
  if (!taskManagerInstance) return;
  
  try {
    // Agenda limpeza de tarefas antigas (diariamente)
    const cleanupDate = new Date();
    cleanupDate.setDate(cleanupDate.getDate() - 7); // Remove tarefas com mais de 7 dias
    
    await taskManagerInstance.createCleanupTask(
      'expired_tasks',
      cleanupDate,
      'low'
    );
    
    // Agenda geração de relatórios analíticos (semanalmente)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    await taskManagerInstance.createAnalyticsTask(
      ['promotion_usage', 'user_engagement', 'reward_distribution'],
      { start: lastWeek, end: new Date() },
      'medium'
    );
    
    console.log('📅 Tarefas automáticas agendadas');
  } catch (error) {
    console.error('❌ Erro ao agendar tarefas automáticas:', error);
  }
};