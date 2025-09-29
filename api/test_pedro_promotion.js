const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function testPedroPromotion() {
  try {
    console.log('🧪 TESTE ESPECÍFICO DA PROMOÇÃO PEDRO');
    console.log('='.repeat(60));

    // 1. Verificar se a promoção Pedro existe
    console.log('\n📊 VERIFICANDO PROMOÇÃO PEDRO:');
    console.log('-'.repeat(40));
    
    const pedroPromotion = await pool.query(`
      SELECT promocao_id, nome, 
             (SELECT COUNT(*) FROM usuario_promocao WHERE promocao_id = p.promocao_id) as usuarios_vinculados
      FROM promocoes p 
      WHERE nome ILIKE '%pedro%'
    `);

    if (pedroPromotion.rows.length === 0) {
      console.log('❌ Promoção Pedro não encontrada!');
      return;
    }

    const promo = pedroPromotion.rows[0];
    console.log(`✅ Promoção encontrada: "${promo.nome}" (ID: ${promo.promocao_id})`);
    console.log(`   Usuários vinculados: ${promo.usuarios_vinculados}`);

    // 2. Simular importação CSV com nome Pedro
    console.log('\n📥 SIMULANDO IMPORTAÇÃO CSV PARA PEDRO:');
    console.log('-'.repeat(40));
    
    // Limpar dados de teste anteriores
    await pool.query('DELETE FROM staging_import WHERE smartico_user_id >= 888000');
    await pool.query('DELETE FROM usuarios_final WHERE smartico_user_id >= 888000');
    await pool.query('DELETE FROM usuario_promocao WHERE smartico_user_id >= 888000');
    
    // Inserir dados de teste na staging com o nome exato da promoção Pedro
    const testData = [
      { smartico_user_id: 888001, user_ext_id: 'pedro_test_001', promocao_nome: promo.nome },
      { smartico_user_id: 888002, user_ext_id: 'pedro_test_002', promocao_nome: promo.nome },
      { smartico_user_id: 888003, user_ext_id: 'pedro_test_003', promocao_nome: promo.nome }
    ];

    for (const data of testData) {
      await pool.query(`
        INSERT INTO staging_import (smartico_user_id, user_ext_id, promocao_nome, filename, import_date)
        VALUES ($1, $2, $3, 'test_pedro.csv', NOW())
      `, [data.smartico_user_id, data.user_ext_id, data.promocao_nome]);
    }

    console.log(`✅ Inseridos 3 registros na staging com promoção "${promo.nome}"`);

    // 3. Executar merge de usuários
    console.log('\n🔄 EXECUTANDO MERGE DE USUÁRIOS:');
    console.log('-'.repeat(40));
    
    const insertResult = await pool.query(`
      INSERT INTO usuarios_final (smartico_user_id, user_ext_id, created_at, updated_at)
      SELECT DISTINCT smartico_user_id, user_ext_id, NOW(), NOW()
      FROM staging_import s
      WHERE smartico_user_id >= 888000
      AND NOT EXISTS (
        SELECT 1 FROM usuarios_final u 
        WHERE u.smartico_user_id = s.smartico_user_id
      )
      RETURNING smartico_user_id
    `);

    console.log(`✅ ${insertResult.rows.length} usuários inseridos`);

    // 4. Executar vinculação com promoções
    console.log('\n🔗 EXECUTANDO VINCULAÇÃO COM PROMOÇÕES:');
    console.log('-'.repeat(40));
    
    // Verificar se a vinculação vai funcionar
    const matchTest = await pool.query(`
      SELECT s.smartico_user_id, s.promocao_nome, p.promocao_id, p.nome as promo_db_nome
      FROM staging_import s
      LEFT JOIN promocoes p ON p.nome = s.promocao_nome
      WHERE s.smartico_user_id >= 888000
    `);

    console.log('🔍 TESTE DE CORRESPONDÊNCIA:');
    matchTest.rows.forEach(row => {
      console.log(`   Usuário ${row.smartico_user_id}: "${row.promocao_nome}" → ${row.promocao_id ? `Promoção ID ${row.promocao_id}` : 'SEM CORRESPONDÊNCIA'}`);
    });

    const linkResult = await pool.query(`
      INSERT INTO usuario_promocao (smartico_user_id, promocao_id, data_vinculo, created_at, updated_at)
      SELECT DISTINCT s.smartico_user_id, p.promocao_id, NOW(), NOW(), NOW()
      FROM staging_import s
      INNER JOIN promocoes p ON p.nome = s.promocao_nome
      WHERE s.smartico_user_id >= 888000
      AND NOT EXISTS (
        SELECT 1 FROM usuario_promocao up 
        WHERE up.smartico_user_id = s.smartico_user_id 
        AND up.promocao_id = p.promocao_id
      )
      RETURNING smartico_user_id, promocao_id
    `);

    console.log(`✅ ${linkResult.rows.length} vinculações criadas`);

    // 5. Verificar resultado final
    console.log('\n📊 RESULTADO FINAL:');
    console.log('-'.repeat(40));
    
    const finalCheck = await pool.query(`
      SELECT promocao_id, nome, 
             (SELECT COUNT(*) FROM usuario_promocao WHERE promocao_id = p.promocao_id) as usuarios_vinculados
      FROM promocoes p 
      WHERE nome ILIKE '%pedro%'
    `);

    const finalPromo = finalCheck.rows[0];
    console.log(`Promoção "${finalPromo.nome}" agora tem ${finalPromo.usuarios_vinculados} usuários vinculados`);

    // 6. Verificar usuários específicos
    const testUsers = await pool.query(`
      SELECT up.smartico_user_id, p.nome as promocao_nome
      FROM usuario_promocao up
      INNER JOIN promocoes p ON p.promocao_id = up.promocao_id
      WHERE up.smartico_user_id >= 888000
      ORDER BY up.smartico_user_id
    `);

    console.log('\n👥 USUÁRIOS DE TESTE VINCULADOS:');
    testUsers.rows.forEach(user => {
      console.log(`   Usuário ${user.smartico_user_id} → ${user.promocao_nome}`);
    });

    if (finalPromo.usuarios_vinculados > promo.usuarios_vinculados) {
      console.log('\n🎉 SUCESSO! A vinculação funcionou!');
    } else {
      console.log('\n❌ FALHA! A vinculação não funcionou');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await pool.end();
  }
}

testPedroPromotion();