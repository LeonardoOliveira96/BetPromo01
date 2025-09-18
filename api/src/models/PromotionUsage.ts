import mongoose, { Document, Schema } from 'mongoose';

export interface IPromotionUsage extends Document {
  user: mongoose.Types.ObjectId;
  promotion: mongoose.Types.ObjectId;
  usedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  rewardAmount: number;
  currency: string;
  conditions: {
    depositAmount?: number;
    betAmount?: number;
    odds?: number;
    sport?: string;
  };
  notes?: string;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionUsageSchema = new Schema<IPromotionUsage>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Usuário é obrigatório'],
    },
    promotion: {
      type: Schema.Types.ObjectId,
      ref: 'Promotion',
      required: [true, 'Promoção é obrigatória'],
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected', 'expired'],
        message: 'Status inválido',
      },
      default: 'pending',
    },
    rewardAmount: {
      type: Number,
      required: [true, 'Valor da recompensa é obrigatório'],
      min: [0, 'Valor da recompensa não pode ser negativo'],
    },
    currency: {
      type: String,
      required: [true, 'Moeda é obrigatória'],
      default: 'BRL',
      uppercase: true,
      minlength: [3, 'Código da moeda deve ter 3 caracteres'],
      maxlength: [3, 'Código da moeda deve ter 3 caracteres'],
    },
    conditions: {
      depositAmount: {
        type: Number,
        min: [0, 'Valor do depósito não pode ser negativo'],
      },
      betAmount: {
        type: Number,
        min: [0, 'Valor da aposta não pode ser negativo'],
      },
      odds: {
        type: Number,
        min: [1, 'Odds devem ser pelo menos 1.0'],
      },
      sport: {
        type: String,
        trim: true,
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notas devem ter no máximo 500 caracteres'],
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    processedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para melhor performance
PromotionUsageSchema.index({ user: 1, promotion: 1 }, { unique: true });
PromotionUsageSchema.index({ status: 1 });
PromotionUsageSchema.index({ usedAt: 1 });
PromotionUsageSchema.index({ expiresAt: 1 });
PromotionUsageSchema.index({ processedBy: 1 });

// Middleware para definir data de expiração
PromotionUsageSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Define expiração para 30 dias após o uso
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Método para aprovar uso da promoção
PromotionUsageSchema.methods.approve = function(processedBy: mongoose.Types.ObjectId) {
  this.status = 'approved';
  this.processedBy = processedBy;
  this.processedAt = new Date();
  return this.save();
};

// Método para rejeitar uso da promoção
PromotionUsageSchema.methods.reject = function(processedBy: mongoose.Types.ObjectId, notes?: string) {
  this.status = 'rejected';
  this.processedBy = processedBy;
  this.processedAt = new Date();
  if (notes) this.notes = notes;
  return this.save();
};

export const PromotionUsage = mongoose.model<IPromotionUsage>('PromotionUsage', PromotionUsageSchema);