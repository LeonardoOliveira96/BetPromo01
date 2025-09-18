import mongoose, { Document, Schema } from 'mongoose';

export interface IPromotion extends Document {
  title: string;
  description: string;
  type: 'welcome_bonus' | 'deposit_bonus' | 'free_bet' | 'cashback' | 'loyalty_reward';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  conditions: {
    minDeposit?: number;
    minOdds?: number;
    maxBetAmount?: number;
    eligibleSports?: string[];
    newUsersOnly?: boolean;
    minAge?: number;
  };
  reward: {
    type: 'percentage' | 'fixed_amount' | 'free_bet';
    value: number;
    maxValue?: number;
    currency: string;
  };
  usageLimit?: number;
  usageCount: number;
  targetAudience: {
    userRoles?: string[];
    countries?: string[];
    excludedUsers?: mongoose.Types.ObjectId[];
  };
  priority: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    title: {
      type: String,
      required: [true, 'Título é obrigatório'],
      trim: true,
      minlength: [3, 'Título deve ter pelo menos 3 caracteres'],
      maxlength: [100, 'Título deve ter no máximo 100 caracteres'],
    },
    description: {
      type: String,
      required: [true, 'Descrição é obrigatória'],
      trim: true,
      maxlength: [1000, 'Descrição deve ter no máximo 1000 caracteres'],
    },
    type: {
      type: String,
      required: [true, 'Tipo de promoção é obrigatório'],
      enum: {
        values: ['welcome_bonus', 'deposit_bonus', 'free_bet', 'cashback', 'loyalty_reward'],
        message: 'Tipo de promoção inválido',
      },
    },
    startDate: {
      type: Date,
      required: [true, 'Data de início é obrigatória'],
    },
    endDate: {
      type: Date,
      required: [true, 'Data de fim é obrigatória'],
      validate: {
        validator: function(this: IPromotion, value: Date) {
          return value > this.startDate;
        },
        message: 'Data de fim deve ser posterior à data de início',
      },
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    conditions: {
      minDeposit: {
        type: Number,
        min: [0, 'Depósito mínimo não pode ser negativo'],
      },
      minOdds: {
        type: Number,
        min: [1, 'Odds mínimas devem ser pelo menos 1.0'],
      },
      maxBetAmount: {
        type: Number,
        min: [0, 'Valor máximo da aposta não pode ser negativo'],
      },
      eligibleSports: [{
        type: String,
        trim: true,
      }],
      newUsersOnly: {
        type: Boolean,
        default: false,
      },
      minAge: {
        type: Number,
        min: [18, 'Idade mínima deve ser 18 anos'],
        max: [100, 'Idade mínima inválida'],
      },
    },
    reward: {
      type: {
        type: String,
        required: [true, 'Tipo de recompensa é obrigatório'],
        enum: {
          values: ['percentage', 'fixed_amount', 'free_bet'],
          message: 'Tipo de recompensa inválido',
        },
      },
      value: {
        type: Number,
        required: [true, 'Valor da recompensa é obrigatório'],
        min: [0, 'Valor da recompensa não pode ser negativo'],
      },
      maxValue: {
        type: Number,
        min: [0, 'Valor máximo da recompensa não pode ser negativo'],
      },
      currency: {
        type: String,
        required: [true, 'Moeda é obrigatória'],
        default: 'BRL',
        uppercase: true,
        minlength: [3, 'Código da moeda deve ter 3 caracteres'],
        maxlength: [3, 'Código da moeda deve ter 3 caracteres'],
      },
    },
    usageLimit: {
      type: Number,
      min: [1, 'Limite de uso deve ser pelo menos 1'],
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, 'Contador de uso não pode ser negativo'],
    },
    targetAudience: {
      userRoles: [{
        type: String,
        enum: ['admin', 'manager', 'user'],
      }],
      countries: [{
        type: String,
        uppercase: true,
        minlength: [2, 'Código do país deve ter 2 caracteres'],
        maxlength: [2, 'Código do país deve ter 2 caracteres'],
      }],
      excludedUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
    },
    priority: {
      type: Number,
      default: 0,
      min: [0, 'Prioridade não pode ser negativa'],
      max: [10, 'Prioridade máxima é 10'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Criador da promoção é obrigatório'],
    },
  },
  {
    timestamps: true,
  }
);

// Índices para melhor performance
PromotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
PromotionSchema.index({ type: 1 });
PromotionSchema.index({ priority: -1 });
PromotionSchema.index({ 'targetAudience.countries': 1 });
PromotionSchema.index({ createdBy: 1 });

// Método virtual para verificar se a promoção está válida
PromotionSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive && this.startDate <= now && this.endDate >= now;
});

// Método virtual para verificar se ainda há usos disponíveis
PromotionSchema.virtual('hasUsageAvailable').get(function() {
  if (!this.usageLimit) return true;
  return this.usageCount < this.usageLimit;
});

// Middleware para validar datas antes de salvar
PromotionSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    next(new Error('Data de início deve ser anterior à data de fim'));
  }
  next();
});

export const Promotion = mongoose.model<IPromotion>('Promotion', PromotionSchema);