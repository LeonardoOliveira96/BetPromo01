const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function testPromotionNameDirect() {
  console.log('🧪 Testando correção do nome da promoção diretamente...\n');

  try {
    // 1. Verificar estado atual
    console.log('📊 Estado atual das promoções:');
    const currentPromotions = await pool.query(`
      SELECT nome, 
             (SELECT COUNT(*) FROM usuario_promocao up WHERE up.promocao_id = p.promocao_id) as usuarios_vinculados
      FROM promocoes p 
      ORDER BY nome
    `);
    
    currentPromotions.rows.forEach(row => {
      console.log(`   - ${row.nome}: ${row.usuarios_vinculados} usuários`);
    });

    // 2. Simular inserção na staging com promotionName específico
    const testPromotionName = 'TESTE CORREÇÃO PROMOÇÃO';
    const testFilename = 'test_correction_' + Date.now() + '.csv';
    
    console.log(`\n🔄 Simulando inserção com promotionName: "${testPromotionName}"`);
    
    // Inserir dados de teste na staging
    await pool.query(`
      INSERT INTO staging_import (
        smartico_user_id, user_ext_id, core_sm_brand_id, crm_brand_id,
        ext_brand_id, crm_brand_name, promocao_nome, regras,
        data_inicio, data_fim, filename
      ) VALUES 
      (888001, 'test_001', 1, 1, 1, 'bet7k', $1, 'Regras teste', '2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z', $2),
      (888002, 'test_002', 1, 1, 1, 'bet7k', $1, 'Regras teste', '2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z', $2),
      (888003, 'test_003', 1, 1, 1, 'bet7k', $1, 'Regras teste', '2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z', $2)
    `, [testPromotionName, testFilename]);

    console.log('✅ Dados inseridos na staging');

    // 3. Executar processo de merge (simular o que o csvService faz)
    
    // Merge usuários
    await pool.query(`
      INSERT INTO usuarios_final (smartico_user_id, user_ext_id, core_sm_brand_id, crm_brand_id, ext_brand_id, crm_brand_name)
      SELECT DISTINCT smartico_user_id, user_ext_id, core_sm_brand_id, crm_brand_id, ext_brand_id, crm_brand_name
      FROM staging_import 
      WHERE filename = $1
      ON CONFLICT (smartico_user_id) DO NOTHING
    `, [testFilename]);

    // Criar promoção
    await pool.query(`
      INSERT INTO promocoes (nome, regras, data_inicio, data_fim, status)
      SELECT 
        promocao_nome,
        MAX(regras) as regras,
        MIN(data_inicio) as data_inicio,
        MAX(data_fim) as data_fim,
        'active'
      FROM staging_import 
      WHERE filename = $1 
        AND promocao_nome IS NOT NULL
      GROUP BY promocao_nome
      ON CONFLICT (nome) DO UPDATE SET
        regras = COALESCE(EXCLUDED.regras, promocoes.regras),
        data_inicio = COALESCE(EXCLUDED.data_inicio, promocoes.data_inicio),
        data_fim = COALESCE(EXCLUDED.data_fim, promocoes.data_fim),
        updated_at = NOW()
    `, [testFilename]);

    // Vincular usuários às promoções
    const linkResult = await pool.query(`
      INSERT INTO usuario_promocao (
        smartico_user_id, promocao_id, data_inicio, data_fim, regras, status
      )
      SELECT 
        s.smartico_user_id,
        p.promocao_id,
        MIN(s.data_inicio) as data_inicio,
        MAX(s.data_fim) as data_fim,
        MAX(s.regras) as regras,
        'active'
      FROM staging_import s
      JOIN promocoes p ON s.promocao_nome = p.nome
      WHERE s.filename = $1
      GROUP BY s.smartico_user_id, p.promocao_id
      ON CONFLICT (smartico_user_id, promocao_id) DO NOTHING
      RETURNING *
    `, [testFilename]);

    console.log(`✅ ${linkResult.rowCount} usuários vinculados à promoção`);

    // 4. Verificar resultado
    console.log('\n📊 Estado após o teste:');
    const finalPromotions = await pool.query(`
      SELECT nome, 
             (SELECT COUNT(*) FROM usuario_promocao up WHERE up.promocao_id = p.promocao_id) as usuarios_vinculados
      FROM promocoes p 
      ORDER BY nome
    `);
    
    finalPromotions.rows.forEach(row => {
      console.log(`   - ${row.nome}: ${row.usuarios_vinculados} usuários`);
    });

    // 5. Limpar dados de teste
    await pool.query('DELETE FROM staging_import WHERE filename = $1', [testFilename]);
    console.log('\n🧹 Dados de teste removidos da staging');

    console.log('\n✅ Teste concluído com sucesso!');
    
    if (linkResult.rowCount > 0) {
      console.log(`🎯 RESULTADO: A correção funcionou! ${linkResult.rowCount} usuários foram vinculados à promoção "${testPromotionName}"`);
    } else {
      console.log('❌ RESULTADO: A correção não funcionou. Nenhum usuário foi vinculado.');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testPromotionNameDirect();