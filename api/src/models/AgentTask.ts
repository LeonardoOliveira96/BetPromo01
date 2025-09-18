import mongoose, { Document, Schema } from 'mongoose';

export interface IAgentTask extends Document {
  type: 'promotion_notification' | 'usage_validation' | 'report_generation' | 'cleanup' | 'analytics';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data: any; // Dados específicos da tarefa
  result?: any; // Resultado da execução
  error?: string; // Mensagem de erro se houver
  attempts: number;
  maxAttempts: number;
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  processingTime?: number; // Em milissegundos
  agent?: string; // Nome do agent responsável
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Métodos
  startProcessing(agentName: string): Promise<IAgentTask>;
  complete(result?: any): Promise<IAgentTask>;
  fail(error: string): Promise<IAgentTask>;
  cancel(): Promise<IAgentTask>;
}

const AgentTaskSchema = new Schema<IAgentTask>(
  {
    type: {
      type: String,
      required: [true, 'Tipo da tarefa é obrigatório'],
      enum: {
        values: ['promotion_notification', 'usage_validation', 'report_generation', 'cleanup', 'analytics'],
        message: 'Tipo de tarefa inválido',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        message: 'Status inválido',
      },
      default: 'pending',
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: 'Prioridade inválida',
      },
      default: 'medium',
    },
    data: {
      type: Schema.Types.Mixed,
      required: [true, 'Dados da tarefa são obrigatórios'],
    },
    result: {
      type: Schema.Types.Mixed,
    },
    error: {
      type: String,
      trim: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: [0, 'Tentativas não podem ser negativas'],
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: [1, 'Máximo de tentativas deve ser pelo menos 1'],
      max: [10, 'Máximo de tentativas não pode exceder 10'],
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    processingTime: {
      type: Number,
      min: [0, 'Tempo de processamento não pode ser negativo'],
    },
    agent: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Índices para melhor performance
AgentTaskSchema.index({ status: 1, scheduledFor: 1 });
AgentTaskSchema.index({ type: 1 });
AgentTaskSchema.index({ priority: 1 });
AgentTaskSchema.index({ agent: 1 });
AgentTaskSchema.index({ createdBy: 1 });

// Método para iniciar processamento da tarefa
AgentTaskSchema.methods.startProcessing = function(agentName: string) {
  this.status = 'processing';
  this.startedAt = new Date();
  this.agent = agentName;
  this.attempts += 1;
  return this.save();
};

// Método para completar tarefa com sucesso
AgentTaskSchema.methods.complete = function(result?: any) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (this.startedAt) {
    this.processingTime = this.completedAt.getTime() - this.startedAt.getTime();
  }
  if (result !== undefined) {
    this.result = result;
  }
  return this.save();
};

// Método para marcar tarefa como falhada
AgentTaskSchema.methods.fail = function(error: string) {
  this.error = error;
  
  if (this.attempts >= this.maxAttempts) {
    this.status = 'failed';
    this.completedAt = new Date();
    if (this.startedAt) {
      this.processingTime = this.completedAt.getTime() - this.startedAt.getTime();
    }
  } else {
    this.status = 'pending';
    // Reagenda para 5 minutos no futuro
    this.scheduledFor = new Date(Date.now() + 5 * 60 * 1000);
  }
  
  return this.save();
};

// Método para cancelar tarefa
AgentTaskSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.completedAt = new Date();
  if (this.startedAt) {
    this.processingTime = this.completedAt.getTime() - this.startedAt.getTime();
  }
  return this.save();
};

// Método estático para buscar próximas tarefas
AgentTaskSchema.statics.getNextTasks = function(limit: number = 10) {
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: new Date() },
  })
    .sort({ priority: -1, scheduledFor: 1 })
    .limit(limit);
};

export const AgentTask = mongoose.model<IAgentTask>('AgentTask', AgentTaskSchema);