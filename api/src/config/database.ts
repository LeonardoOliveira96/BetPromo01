import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/betpromo';
    
    await mongoose.connect(mongoUri, {
      // Configurações recomendadas para produção
      maxPoolSize: 10, // Máximo de 10 conexões no pool
      serverSelectionTimeoutMS: 5000, // Timeout de 5 segundos para seleção do servidor
      socketTimeoutMS: 45000, // Timeout de 45 segundos para operações
    });

    console.log('✅ Conectado ao MongoDB com sucesso');
    
    // Event listeners para monitoramento da conexão
    mongoose.connection.on('error', (error) => {
      console.error('❌ Erro na conexão com MongoDB:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ Desconectado do MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 Reconectado ao MongoDB');
    });

  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB');
  } catch (error) {
    console.error('❌ Erro ao desconectar do MongoDB:', error);
  }
};