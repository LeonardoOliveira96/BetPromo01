import mongoose, { Document, Schema } from 'mongoose';

export interface IPromotionHistory {
  promotion_id: string;
  filename: string;
  added_date: Date;
  status: 'active' | 'inactive' | 'expired';
}

export interface IFileHistory {
  filename: string;
  uploaded_date: Date;
  promotion_id: string;
}

export interface IPromotionUser extends Document {
  smartico_user_id: number;
  user_ext_id: string;
  core_sm_brand_id: number;
  crm_brand_id: number;
  ext_brand_id: string;
  crm_brand_name: string;
  current_promotions: string[];
  promotion_history: IPromotionHistory[];
  file_history: IFileHistory[];
  created_at: Date;
  updated_at: Date;
  
  // Métodos auxiliares
  addPromotion(promotionId: string, filename: string): void;
  removePromotion(promotionId: string): void;
  isInPromotion(promotionId: string): boolean;
}

const PromotionHistorySchema = new Schema<IPromotionHistory>({
  promotion_id: {
    type: String,
    required: true,
    trim: true,
  },
  filename: {
    type: String,
    required: true,
    trim: true,
  },
  added_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
  },
}, { _id: false });

const FileHistorySchema = new Schema<IFileHistory>({
  filename: {
    type: String,
    required: true,
    trim: true,
  },
  uploaded_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  promotion_id: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });

const PromotionUserSchema = new Schema<IPromotionUser>(
  {
    smartico_user_id: {
      type: Number,
      required: [true, 'smartico_user_id é obrigatório'],
      unique: true,
      index: true,
    },
    user_ext_id: {
      type: String,
      required: [true, 'user_ext_id é obrigatório'],
      trim: true,
      index: true,
    },
    core_sm_brand_id: {
      type: Number,
      required: [true, 'core_sm_brand_id é obrigatório'],
      index: true,
    },
    crm_brand_id: {
      type: Number,
      required: [true, 'crm_brand_id é obrigatório'],
      index: true,
    },
    ext_brand_id: {
      type: String,
      required: [true, 'ext_brand_id é obrigatório'],
      trim: true,
      index: true,
    },
    crm_brand_name: {
      type: String,
      required: [true, 'crm_brand_name é obrigatório'],
      trim: true,
      index: true,
    },
    current_promotions: [{
      type: String,
      trim: true,
    }],
    promotion_history: [PromotionHistorySchema],
    file_history: [FileHistorySchema],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Índices compostos para performance otimizada
PromotionUserSchema.index({ smartico_user_id: 1, 'current_promotions': 1 });
PromotionUserSchema.index({ 'current_promotions': 1 });
PromotionUserSchema.index({ 'promotion_history.promotion_id': 1 });
PromotionUserSchema.index({ 'promotion_history.status': 1 });
PromotionUserSchema.index({ ext_brand_id: 1, crm_brand_id: 1 });
PromotionUserSchema.index({ crm_brand_name: 1 });
PromotionUserSchema.index({ 'file_history.filename': 1 });
PromotionUserSchema.index({ 'file_history.promotion_id': 1 });

// Índices específicos para busca eficiente
PromotionUserSchema.index({ user_ext_id: 'text' }); // Índice de texto para busca parcial
PromotionUserSchema.index({ smartico_user_id: 1, updated_at: -1 }); // Para busca por ID com ordenação
PromotionUserSchema.index({ user_ext_id: 1, updated_at: -1 }); // Para busca por ext_id com ordenação
PromotionUserSchema.index({ updated_at: -1 }); // Para ordenação geral por data de atualização

// Método para adicionar promoção
PromotionUserSchema.methods.addPromotion = function(promotionId: string, filename: string) {
  // Adiciona à lista de promoções atuais se não existir
  if (!this.current_promotions.includes(promotionId)) {
    this.current_promotions.push(promotionId);
  }
  
  // Adiciona ao histórico de promoções
  const existingPromotion = this.promotion_history.find(
    (p: IPromotionHistory) => p.promotion_id === promotionId
  );
  
  if (!existingPromotion) {
    this.promotion_history.push({
      promotion_id: promotionId,
      filename: filename,
      added_date: new Date(),
      status: 'active',
    });
  }
  
  // Adiciona ao histórico de arquivos
  const existingFile = this.file_history.find(
    (f: IFileHistory) => f.filename === filename && f.promotion_id === promotionId
  );
  
  if (!existingFile) {
    this.file_history.push({
      filename: filename,
      uploaded_date: new Date(),
      promotion_id: promotionId,
    });
  }
};

// Método para remover promoção
PromotionUserSchema.methods.removePromotion = function(promotionId: string) {
  // Remove da lista de promoções atuais
  this.current_promotions = this.current_promotions.filter(
    (p: string) => p !== promotionId
  );
  
  // Atualiza status no histórico
  const promotion = this.promotion_history.find(
    (p: IPromotionHistory) => p.promotion_id === promotionId
  );
  if (promotion) {
    promotion.status = 'inactive';
  }
};

// Método para verificar se usuário está em promoção
PromotionUserSchema.methods.isInPromotion = function(promotionId: string): boolean {
  return this.current_promotions.includes(promotionId);
};

export const PromotionUser = mongoose.model<IPromotionUser>('PromotionUser', PromotionUserSchema);