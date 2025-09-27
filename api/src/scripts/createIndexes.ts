import mongoose from 'mongoose';
import { PromotionUser } from '../models/PromotionUser';
import { connectDB, disconnectDB } from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

async function createIndexes() {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    await connectDB();

    console.log('🔄 Criando índices para PromotionUser...');

    // Índices já definidos no schema, mas vamos garantir que existem
    const collection = PromotionUser.collection;

    // Índices principais para performance
    const indexes: Record<string, number>[] = [
      // Índice único para smartico_user_id
      { smartico_user_id: 1 },
      
      // Índices simples para campos frequentemente consultados
      { user_ext_id: 1 },
      { core_sm_brand_id: 1 },
      { crm_brand_id: 1 },
      { ext_brand_id: 1 },
      { crm_brand_name: 1 },
      
      // Índices para arrays
      { current_promotions: 1 },
      { 'promotion_history.promotion_id': 1 },
      { 'promotion_history.status': 1 },
      { 'file_history.filename': 1 },
      { 'file_history.promotion_id': 1 },
      
      // Índices compostos para consultas complexas
      { smartico_user_id: 1, current_promotions: 1 },
      { ext_brand_id: 1, crm_brand_id: 1 },
      { crm_brand_name: 1, current_promotions: 1 },
      
      // Índices para consultas de histórico
      { 'promotion_history.promotion_id': 1, 'promotion_history.status': 1 },
      { 'file_history.promotion_id': 1, 'file_history.uploaded_date': -1 },
      
      // Índices para timestamps
      { created_at: 1 },
      { updated_at: 1 },
    ];

    for (const index of indexes) {
      try {
        await collection.createIndex(index);
        console.log(`✅ Índice criado: ${JSON.stringify(index)}`);
      } catch (error: any) {
        if (error.code === 85) {
          console.log(`⚠️ Índice já existe: ${JSON.stringify(index)}`);
        } else {
          console.error(`❌ Erro ao criar índice ${JSON.stringify(index)}:`, error.message);
        }
      }
    }

    // Índices de texto para busca
    try {
      await collection.createIndex({
        crm_brand_name: 'text',
        ext_brand_id: 'text',
        user_ext_id: 'text'
      }, {
        name: 'text_search_index'
      });
      console.log('✅ Índice de texto criado para busca');
    } catch (error: any) {
      if (error.code === 85) {
        console.log('⚠️ Índice de texto já existe');
      } else {
        console.error('❌ Erro ao criar índice de texto:', error.message);
      }
    }

    // Verifica os índices criados
    const existingIndexes = await collection.listIndexes().toArray();
    console.log('\n📊 Índices existentes:');
    existingIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n✅ Criação de índices concluída!');

  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
  } finally {
    await disconnectDB();
  }
}

// Executa o script se chamado diretamente
if (require.main === module) {
  createIndexes();
}

export { createIndexes };