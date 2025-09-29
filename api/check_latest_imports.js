const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function checkLatestImports() {
  try {
    console.log('🔍 VERIFICANDO IMPORTAÇÕES MAIS RECENTES');
    console.log('='.repeat(60));

    // Verificar todas as importações ordenadas por data
    const allImports = await pool.query(`
      SELECT 
        smartico_user_id,
        user_ext_id,
        promocao_nome,
        filename,
        import_date,
        processed,
        operation_type
      FROM staging_import 
      ORDER BY import_date DESC 
      LIMIT 20
    `);

    console.log('\n📥 ÚLTIMAS 20 IMPORTAÇÕES:');
    console.log('-'.repeat(60));
    
    if (allImports.rows.length === 0) {
      console.log('❌ Nenhuma importação encontrada');
    } else {
      allImports.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.import_date}`);
        console.log(`   Usuário: ${row.smartico_user_id} (${row.user_ext_id})`);
        console.log(`   Promoção: "${row.promocao_nome}"`);
        console.log(`   Arquivo: ${row.filename}`);
        console.log(`   Processado: ${row.processed}`);
        console.log(`   Operação: ${row.operation_type || 'N/A'}`);
        console.log('');
      });
    }

    // Verificar contagem por promoção na staging
    const stagingCount = await pool.query(`
      SELECT 
        promocao_nome,
        COUNT(*) as total_registros,
        MAX(import_date) as ultima_importacao
      FROM staging_import 
      GROUP BY promocao_nome
      ORDER BY ultima_importacao DESC
    `);

    console.log('\n📊 CONTAGEM POR PROMOÇÃO NA STAGING:');
    console.log('-'.repeat(50));
    
    stagingCount.rows.forEach(row => {
      console.log(`"${row.promocao_nome}": ${row.total_registros} registros`);
      console.log(`   Última importação: ${row.ultima_importacao}`);
      console.log('');
    });

    // Verificar usuários finais
    const finalUsers = await pool.query(`
      SELECT COUNT(*) as total_usuarios
      FROM usuarios_final
    `);

    console.log('\n👥 TOTAL DE USUÁRIOS FINAIS:');
    console.log('-'.repeat(30));
    console.log(`Total: ${finalUsers.rows[0].total_usuarios}`);

    // Verificar vinculações
    const promotionLinks = await pool.query(`
      SELECT 
        p.nome as promocao_nome,
        COUNT(up.smartico_user_id) as usuarios_vinculados
      FROM promocoes p
      LEFT JOIN usuario_promocao up ON p.promocao_id = up.promocao_id
      GROUP BY p.promocao_id, p.nome
      ORDER BY p.promocao_id DESC
    `);

    console.log('\n🔗 VINCULAÇÕES POR PROMOÇÃO:');
    console.log('-'.repeat(40));
    
    promotionLinks.rows.forEach(row => {
      console.log(`"${row.promocao_nome}": ${row.usuarios_vinculados} usuários`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkLatestImports();