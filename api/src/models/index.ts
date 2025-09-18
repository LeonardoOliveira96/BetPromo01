// Exporta todos os modelos para facilitar importação
export { User, IUser } from './User';
export { Promotion, IPromotion } from './Promotion';
export { PromotionUsage, IPromotionUsage } from './PromotionUsage';
export { AgentTask, IAgentTask } from './AgentTask';

// Função para inicializar todos os modelos
export const initializeModels = () => {
  // Os modelos são inicializados automaticamente quando importados
  console.log('📊 Modelos MongoDB inicializados');
};