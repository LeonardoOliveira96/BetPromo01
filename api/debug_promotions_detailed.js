const { Pool } = require('pg');

const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function checkPromotionsDetailed() {
  try {
    console.log('🔍 Verificando promoções existentes...\n');

    // 1. Listar todas as promoções
    const promotionsResult = await pool.query(`
      SELECT 
        promocao_id,
        nome,
        regras,
        data_inicio,
        data_fim,
        status,
        created_at
      FROM promocoes 
      ORDER BY created_at DESC
    `);

    console.log('📋 PROMOÇÕES EXISTENTES:');
    console.log('========================');
    promotionsResult.rows.forEach((promo, index) => {
      console.log(`${index + 1}. ID: ${promo.promocao_id}`);
      console.log(`   Nome: ${promo.nome}`);
      console.log(`   Status: ${promo.status}`);
      console.log(`   Início: ${promo.data_inicio}`);
      console.log(`   Fim: ${promo.data_fim}`);
      console.log(`   Criada em: ${promo.created_at}`);
      console.log('   ---');
    });

    // 2. Verificar vinculações usuário-promoção
    const linkagesResult = await pool.query(`
      SELECT 
        up.smartico_user_id,
        up.promocao_id,
        p.nome as promocao_nome,
        up.data_inicio,
        up.data_fim,
        up.status,
        up.created_at
      FROM usuario_promocao up
      JOIN promocoes p ON up.promocao_id = p.promocao_id
      ORDER BY up.created_at DESC
      LIMIT 10
    `);

    console.log('\n🔗 ÚLTIMAS 10 VINCULAÇÕES USUÁRIO-PROMOÇÃO:');
    console.log('===========================================');
    linkagesResult.rows.forEach((link, index) => {
      console.log(`${index + 1}. Usuário: ${link.smartico_user_id}`);
      console.log(`   Promoção: ${link.promocao_nome} (ID: ${link.promocao_id})`);
      console.log(`   Status: ${link.status}`);
      console.log(`   Criada em: ${link.created_at}`);
      console.log('   ---');
    });

    // 3. Contar vinculações por promoção
    const countResult = await pool.query(`
      SELECT 
        p.nome as promocao_nome,
        p.promocao_id,
        COUNT(up.smartico_user_id) as total_usuarios
      FROM promocoes p
      LEFT JOIN usuario_promocao up ON p.promocao_id = up.promocao_id
      GROUP BY p.promocao_id, p.nome
      ORDER BY total_usuarios DESC
    `);

    console.log('\n📊 USUÁRIOS POR PROMOÇÃO:');
    console.log('=========================');
    countResult.rows.forEach((count, index) => {
      console.log(`${index + 1}. ${count.promocao_nome}`);
      console.log(`   ID: ${count.promocao_id}`);
      console.log(`   Usuários vinculados: ${count.total_usuarios}`);
      console.log('   ---');
    });

    // 4. Verificar se há usuários sem promoções
    const usersWithoutPromotions = await pool.query(`
      SELECT COUNT(*) as usuarios_sem_promocao
      FROM usuarios_final u
      LEFT JOIN usuario_promocao up ON u.smartico_user_id = up.smartico_user_id
      WHERE up.smartico_user_id IS NULL
    `);

    console.log('\n⚠️  USUÁRIOS SEM PROMOÇÕES:');
    console.log('===========================');
    console.log(`Total: ${usersWithoutPromotions.rows[0].usuarios_sem_promocao}`);

    // 5. Verificar últimas importações
    const lastImports = await pool.query(`
      SELECT DISTINCT filename, COUNT(*) as registros
      FROM staging_import
      GROUP BY filename
      ORDER BY filename DESC
      LIMIT 5
    `);

    console.log('\n📁 ÚLTIMAS IMPORTAÇÕES:');
    console.log('=======================');
    lastImports.rows.forEach((imp, index) => {
      console.log(`${index + 1}. Arquivo: ${imp.filename}`);
      console.log(`   Registros: ${imp.registros}`);
      console.log('   ---');
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkPromotionsDetailed();