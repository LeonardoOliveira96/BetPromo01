import { User, Client, Promotion, PromotionUsage } from '@/types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@empresa.com',
    role: 'attendant'
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@empresa.com',
    role: 'administrator'
  }
];

export const mockClients: Client[] = [
  {
    id: 'CLI001',
    name: 'Pedro Oliveira',
    email: 'pedro@email.com',
    registrationDate: new Date('2024-01-15')
  },
  {
    id: 'CLI002',
    name: 'Ana Costa',
    email: 'ana@email.com',
    registrationDate: new Date('2024-02-20')
  },
  {
    id: 'CLI003',
    name: 'Carlos Mendes',
    email: 'carlos@email.com',
    registrationDate: new Date('2024-03-10')
  }
];

export const mockPromotions: Promotion[] = [
  {
    id: 'PROMO001',
    name: 'Bônus de Depósito 100%',
    description: 'Dobra seu primeiro depósito até R$ 500',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    brand: 'Casa de Apostas Premium',
    type: 'deposit_bonus',
    rules: 'Depósito mínimo de R$ 50. Rollover 5x.',
    targetAudience: 'all',
    status: 'active',
    createdBy: '2',
    createdAt: new Date('2023-12-15'),
    usageCount: 45,
    eligibleCount: 150
  },
  {
    id: 'PROMO002',
    name: 'Cashback Semanal',
    description: '10% de volta nas perdas da semana',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-02-29'),
    brand: 'Casa de Apostas Premium',
    type: 'cashback',
    rules: 'Mínimo R$ 100 em perdas. Máximo R$ 200 cashback.',
    targetAudience: 'specific',
    targetClientIds: ['CLI001', 'CLI002'],
    status: 'expired',
    createdBy: '2',
    createdAt: new Date('2024-01-25'),
    usageCount: 12,
    eligibleCount: 25
  },
  {
    id: 'PROMO003',
    name: 'Aposta Grátis R$ 25',
    description: 'Aposta grátis para novos clientes',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-03-31'),
    brand: 'Casa de Apostas Premium',
    type: 'free_bet',
    rules: 'Válida por 7 dias após ativação.',
    targetAudience: 'all',
    status: 'active',
    createdBy: '2',
    createdAt: new Date('2024-02-28'),
    usageCount: 8,
    eligibleCount: 75
  }
];

export const mockPromotionUsages: PromotionUsage[] = [
  {
    id: 'USAGE001',
    promotionId: 'PROMO001',
    clientId: 'CLI001',
    usedAt: new Date('2024-01-20'),
    appliedBy: '1',
    status: 'used'
  },
  {
    id: 'USAGE002',
    promotionId: 'PROMO003',
    clientId: 'CLI002',
    usedAt: new Date('2024-03-05'),
    appliedBy: '1',
    status: 'active'
  }
];