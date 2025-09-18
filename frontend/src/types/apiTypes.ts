export interface ApiPromotion {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  description: string;
  isActive: boolean;
  conditions: {
    minDeposit?: number;
    minOdds?: number;
    newUsersOnly?: boolean;
  };
  reward: {
    type: string;
    value: number;
    currency: string;
  };
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPromotionInput {
  title: string;
  description: string;
  type: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  conditions: {
    minDeposit: number;
    minOdds: number;
    newUsersOnly: boolean;
  };
  reward: {
    type: string;
    value: number;
    currency: string;
  };
  priority: number;
}