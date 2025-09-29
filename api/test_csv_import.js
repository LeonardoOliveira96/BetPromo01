const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function testCSVImportDirect() {
  try {
    console.log('🧪 TESTE DIRETO DA CORREÇÃO DE VINCULAÇÃO');
    console.log('='.repeat(60));

    // 1. Verificar estado inicial
    console.log('\n📊 ESTADO INICIAL:');
    console.log('-'.repeat(40));
    
    const initialState = await pool.query(`
      SELECT promocao_id, nome, 
             (SELECT COUNT(*) FROM usuario_promocao WHERE promocao_id = p.promocao_id) as usuarios_vinculados
      FROM promocoes p 
      WHERE nome = 'Bonus de Deposito'
    `);

    if (initialState.rows.length > 0) {
      console.log(`Promoção "Bonus de Deposito" tem ${initialState.rows[0].usuarios_vinculados} usuários vinculados`);
    } else {
      console.log('❌ Promoção "Bonus de Deposito" não encontrada');
      return;
    }

    // 2. Simular inserção na staging com nome de promoção específico
    console.log('\n📥 SIMULANDO IMPORTAÇÃO CSV:');
    console.log('-'.repeat(40));
    
    // Limpar staging primeiro
    await pool.query('DELETE FROM staging_import WHERE smartico_user_id >= 999000');
    
    // Inserir dados de teste na staging com o nome correto da promoção
    const testData = [
      { smartico_user_id: 999001, user_ext_id: 'test_user_001', promocao_nome: 'Bonus de Deposito' },
      { smartico_user_id: 999002, user_ext_id: 'test_user_002', promocao_nome: 'Bonus de Deposito' },
      { smartico_user_id: 999003, user_ext_id: 'test_user_003', promocao_nome: 'Bonus de Deposito' }
    ];

    for (const data of testData) {
      await pool.query(`
        INSERT INTO staging_import (smartico_user_id, user_ext_id, promocao_nome, filename, import_date)
        VALUES ($1, $2, $3, 'test_bonus_deposito.csv', NOW())
      `, [data.smartico_user_id, data.user_ext_id, data.promocao_nome]);
    }

    console.log('✅ Dados inseridos na staging com promoção "Bonus de Deposito"');

    // 3. Executar merge de usuários
    console.log('\n🔄 EXECUTANDO MERGE DE USUÁRIOS:');
    console.log('-'.repeat(40));
    
    await pool.query(`
      INSERT INTO usuarios_final (smartico_user_id, user_ext_id, created_at, updated_at)
      SELECT DISTINCT smartico_user_id, user_ext_id, NOW(), NOW()
      FROM staging_import s
      WHERE smartico_user_id >= 999000
      AND NOT EXISTS (
        SELECT 1 FROM usuarios_final u 
        WHERE u.smartico_user_id = s.smartico_user_id
      )
    `);

    console.log('✅ Usuários inseridos/atualizados');

    // 4. Executar vinculação com promoções
    console.log('\n🔗 EXECUTANDO VINCULAÇÃO COM PROMOÇÕES:');
    console.log('-'.repeat(40));
    
    await pool.query(`
      INSERT INTO usuario_promocao (smartico_user_id, promocao_id, data_vinculo, created_at, updated_at)
      SELECT DISTINCT s.smartico_user_id, p.promocao_id, NOW(), NOW(), NOW()
      FROM staging_import s
      INNER JOIN promocoes p ON p.nome = s.promocao_nome
      WHERE s.smartico_user_id >= 999000
      AND NOT EXISTS (
        SELECT 1 FROM usuario_promocao up 
        WHERE up.smartico_user_id = s.smartico_user_id 
        AND up.promocao_id = p.promocao_id
      )
    `);

    console.log('✅ Vinculações criadas');

    // 5. Verificar resultado final
    console.log('\n📊 RESULTADO FINAL:');
    console.log('-'.repeat(40));
    
    const finalState = await pool.query(`
      SELECT promocao_id, nome, 
             (SELECT COUNT(*) FROM usuario_promocao WHERE promocao_id = p.promocao_id) as usuarios_vinculados
      FROM promocoes p 
      WHERE nome = 'Bonus de Deposito'
    `);

    console.log(`Promoção "Bonus de Deposito" agora tem ${finalState.rows[0].usuarios_vinculados} usuários vinculados`);

    // 6. Verificar usuários específicos
    const testUsers = await pool.query(`
      SELECT up.smartico_user_id, p.nome as promocao_nome
      FROM usuario_promocao up
      INNER JOIN promocoes p ON p.promocao_id = up.promocao_id
      WHERE up.smartico_user_id >= 999000
      ORDER BY up.smartico_user_id
    `);

    console.log('\n👥 USUÁRIOS DE TESTE VINCULADOS:');
    testUsers.rows.forEach(user => {
      console.log(`Usuário ${user.smartico_user_id} → ${user.promocao_nome}`);
    });

    if (finalState.rows[0].usuarios_vinculados > initialState.rows[0].usuarios_vinculados) {
      console.log('\n🎉 SUCESSO! A correção está funcionando!');
      console.log('Os usuários foram corretamente vinculados à promoção "Bonus de Deposito"');
    } else {
      console.log('\n❌ FALHA! A correção não está funcionando como esperado');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await pool.end();
  }
}

testCSVImportDirect();