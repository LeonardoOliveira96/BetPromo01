export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  registrationDate: Date;
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  brand: string;
  type: 'deposit_bonus' | 'cashback' | 'free_bet';
  rules: string;
  targetAudience: {
    userRoles: string[];
    specificUsers?: string[];
  };
  status: 'active' | 'inactive' | 'expired';
  createdBy: string;
  createdAt: string;
  usageCount?: number;
  eligibleCount?: number;
}

export interface PromotionUsage {
  id: string;
  promotionId: string;
  clientId: string;
  usedAt: Date;
  appliedBy: string;
  status: 'active' | 'used' | 'expired';
}

export interface ActionLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: Date;
}