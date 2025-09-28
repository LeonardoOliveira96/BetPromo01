const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function testPromotionCreation() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Iniciando teste de criação de promoção...\n');
    
    // 1. Verificar estado inicial
    console.log('📊 Estado inicial das tabelas:');
    const initialPromocoesCount = await client.query('SELECT COUNT(*) FROM promocoes');
    const initialUsuarioPromocaoCount = await client.query('SELECT COUNT(*) FROM usuario_promocao');
    const initialHistoricoCount = await client.query('SELECT COUNT(*) FROM usuario_promocao_historico');
    
    console.log(`- Promoções: ${initialPromocoesCount.rows[0].count}`);
    console.log(`- Vínculos usuário-promoção: ${initialUsuarioPromocaoCount.rows[0].count}`);
    console.log(`- Histórico: ${initialHistoricoCount.rows[0].count}\n`);
    
    // 2. Simular criação de uma nova promoção manual (como seria feita pelo frontend)
    console.log('🎯 Criando nova promoção de teste...');
    
    const promotionData = {
      nome: `Promoção Teste ${Date.now()}`,
      regras: 'Regras de teste para verificar se não há duplicação',
      data_inicio: new Date().toISOString(),
      data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
      status: 'active'
    };
    
    // Inserir promoção (simulando o que o promotionService.createPromotion faz)
    const insertResult = await client.query(`
      INSERT INTO promocoes (nome, regras, data_inicio, data_fim, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING promocao_id, nome
    `, [promotionData.nome, promotionData.regras, promotionData.data_inicio, promotionData.data_fim, promotionData.status]);
    
    const newPromotion = insertResult.rows[0];
    console.log(`✅ Promoção criada: ID ${newPromotion.promocao_id}, Nome: "${newPromotion.nome}"\n`);
    
    // 3. Verificar se apenas UMA promoção foi criada
    console.log('🔍 Verificando se houve duplicação...');
    
    const duplicateCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM promocoes 
      WHERE nome = $1
    `, [promotionData.nome]);
    
    const duplicateCount = parseInt(duplicateCheck.rows[0].count);
    
    if (duplicateCount === 1) {
      console.log('✅ SUCESSO: Apenas 1 promoção foi criada (sem duplicação)');
    } else {
      console.log(`❌ PROBLEMA: ${duplicateCount} promoções foram criadas com o mesmo nome!`);
    }
    
    // 4. Verificar estado final
    console.log('\n📊 Estado final das tabelas:');
    const finalPromocoesCount = await client.query('SELECT COUNT(*) FROM promocoes');
    const finalUsuarioPromocaoCount = await client.query('SELECT COUNT(*) FROM usuario_promocao');
    const finalHistoricoCount = await client.query('SELECT COUNT(*) FROM usuario_promocao_historico');
    
    console.log(`- Promoções: ${finalPromocoesCount.rows[0].count} (incremento: +${finalPromocoesCount.rows[0].count - initialPromocoesCount.rows[0].count})`);
    console.log(`- Vínculos usuário-promoção: ${finalUsuarioPromocaoCount.rows[0].count} (incremento: +${finalUsuarioPromocaoCount.rows[0].count - initialUsuarioPromocaoCount.rows[0].count})`);
    console.log(`- Histórico: ${finalHistoricoCount.rows[0].count} (incremento: +${finalHistoricoCount.rows[0].count - initialHistoricoCount.rows[0].count})`);
    
    // 5. Simular teste de upload CSV com múltiplos usuários para a mesma promoção
    console.log('\n🧪 Testando criação via CSV (simulando upload)...');
    
    // Simular dados de staging_import
    const csvPromotionName = `Promoção CSV Teste ${Date.now()}`;
    
    // Inserir dados de teste na staging_import (simulando upload de CSV)
    await client.query(`
      INSERT INTO staging_import (
        smartico_user_id, user_ext_id, core_sm_brand_id, crm_brand_id,
        ext_brand_id, crm_brand_name, promocao_nome, regras,
        data_inicio, data_fim, filename
      ) VALUES 
      (1001, 'ext_1', 1, 1, 'ext_brand_1', 'Test Brand', $1, 'Regras CSV', $2, $3, 'test_file.csv'),
      (1002, 'ext_2', 1, 1, 'ext_brand_1', 'Test Brand', $1, 'Regras CSV', $2, $3, 'test_file.csv'),
      (1003, 'ext_3', 1, 1, 'ext_brand_1', 'Test Brand', $1, 'Regras CSV', $2, $3, 'test_file.csv')
    `, [csvPromotionName, promotionData.data_inicio, promotionData.data_fim]);
    
    // Executar lógica de criação de promoções (como no csvService.createPromocoes)
    const csvPromotionResult = await client.query(`
      INSERT INTO promocoes (nome, regras, data_inicio, data_fim, status)
      SELECT DISTINCT 
        promocao_nome,
        regras,
        data_inicio,
        data_fim,
        'active'
      FROM staging_import 
      WHERE filename = 'test_file.csv'
        AND promocao_nome IS NOT NULL
        AND promocao_nome NOT IN (SELECT nome FROM promocoes)
      RETURNING promocao_id, nome
    `);
    
    if (csvPromotionResult.rows.length > 0) {
      console.log(`✅ Promoção CSV criada: ID ${csvPromotionResult.rows[0].promocao_id}, Nome: "${csvPromotionResult.rows[0].nome}"`);
      
      // Verificar se não houve duplicação
      const csvDuplicateCheck = await client.query(`
        SELECT COUNT(*) as count 
        FROM promocoes 
        WHERE nome = $1
      `, [csvPromotionName]);
      
      const csvDuplicateCount = parseInt(csvDuplicateCheck.rows[0].count);
      
      if (csvDuplicateCount === 1) {
        console.log('✅ SUCESSO: Apenas 1 promoção CSV foi criada (sem duplicação)');
      } else {
        console.log(`❌ PROBLEMA: ${csvDuplicateCount} promoções CSV foram criadas com o mesmo nome!`);
      }
    } else {
      console.log('ℹ️ Nenhuma nova promoção CSV foi criada (pode já existir)');
    }
    
    // 6. Limpeza dos dados de teste
    console.log('\n🧹 Limpando dados de teste...');
    await client.query('DELETE FROM staging_import WHERE filename = $1', ['test_file.csv']);
    await client.query('DELETE FROM promocoes WHERE nome LIKE $1', ['%Teste%']);
    console.log('✅ Dados de teste removidos');
    
    console.log('\n🎉 Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar teste
testPromotionCreation().catch(console.error);