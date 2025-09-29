const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function testPromotionFix() {
  try {
    console.log('🧪 TESTE DA CORREÇÃO DE VINCULAÇÃO DE PROMOÇÕES');
    console.log('='.repeat(60));

    // 1. Verificar promoções existentes e usuários vinculados
    console.log('\n📊 PROMOÇÕES E USUÁRIOS VINCULADOS:');
    console.log('-'.repeat(40));
    
    const promotionsResult = await pool.query(`
      SELECT promocao_id, nome, 
             (SELECT COUNT(*) FROM usuario_promocao WHERE promocao_id = p.promocao_id) as usuarios_vinculados
      FROM promocoes p 
      ORDER BY promocao_id
    `);

    promotionsResult.rows.forEach(promo => {
      console.log(`${promo.promocao_id}. ${promo.nome} - ${promo.usuarios_vinculados} usuários vinculados`);
    });

    // 2. Verificar nomes de promoção na staging (últimas importações)
    console.log('\n🎯 NOMES DE PROMOÇÃO NA STAGING (últimas importações):');
    console.log('-'.repeat(40));
    
    const stagingPromotionsResult = await pool.query(`
      SELECT promocao_nome, COUNT(*) as quantidade
      FROM staging_import 
      GROUP BY promocao_nome
      ORDER BY quantidade DESC
      LIMIT 10
    `);

    stagingPromotionsResult.rows.forEach(stage => {
      console.log(`"${stage.promocao_nome}" - ${stage.quantidade} registros`);
    });

    // 3. Verificar se há usuários sem promoções
    console.log('\n👥 USUÁRIOS SEM PROMOÇÕES:');
    console.log('-'.repeat(40));
    
    const usersWithoutPromotionsResult = await pool.query(`
      SELECT COUNT(*) as usuarios_sem_promocoes
      FROM usuarios_final u
      WHERE NOT EXISTS (
        SELECT 1 FROM usuario_promocao up WHERE up.smartico_user_id = u.smartico_user_id
      )
    `);

    console.log(`${usersWithoutPromotionsResult.rows[0].usuarios_sem_promocoes} usuários sem promoções`);

    // 4. Verificar total de usuários
    console.log('\n📈 TOTAIS:');
    console.log('-'.repeat(40));
    
    const totalUsersResult = await pool.query(`SELECT COUNT(*) as total FROM usuarios_final`);
    const totalPromotionsResult = await pool.query(`SELECT COUNT(*) as total FROM promocoes`);
    const totalLinksResult = await pool.query(`SELECT COUNT(*) as total FROM usuario_promocao`);

    console.log(`Total de usuários: ${totalUsersResult.rows[0].total}`);
    console.log(`Total de promoções: ${totalPromotionsResult.rows[0].total}`);
    console.log(`Total de vínculos: ${totalLinksResult.rows[0].total}`);

    console.log('\n✅ TESTE CONCLUÍDO!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await pool.end();
  }
}

testPromotionFix();