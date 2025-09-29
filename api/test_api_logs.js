const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function checkRecentImports() {
  try {
    console.log('🔍 VERIFICANDO IMPORTAÇÕES RECENTES');
    console.log('='.repeat(60));

    // Verificar registros recentes na staging_import
    const recentImports = await pool.query(`
      SELECT 
        smartico_user_id,
        user_ext_id,
        promocao_nome,
        filename,
        import_date,
        processed
      FROM staging_import 
      ORDER BY import_date DESC 
      LIMIT 10
    `);

    console.log('\n📥 ÚLTIMAS 10 IMPORTAÇÕES:');
    console.log('-'.repeat(50));
    
    if (recentImports.rows.length === 0) {
      console.log('❌ Nenhuma importação encontrada');
    } else {
      recentImports.rows.forEach((row, index) => {
        console.log(`${index + 1}. Usuário: ${row.smartico_user_id}`);
        console.log(`   Promoção: "${row.promocao_nome}"`);
        console.log(`   Arquivo: ${row.filename}`);
        console.log(`   Data: ${row.import_date}`);
        console.log(`   Processado: ${row.processed}`);
        console.log('');
      });
    }

    // Verificar promoções disponíveis
    console.log('\n🎯 PROMOÇÕES DISPONÍVEIS:');
    console.log('-'.repeat(50));
    
    const promotions = await pool.query(`
      SELECT promocao_id, nome, 
             (SELECT COUNT(*) FROM usuario_promocao WHERE promocao_id = p.promocao_id) as usuarios_vinculados
      FROM promocoes p 
      ORDER BY promocao_id DESC
    `);

    promotions.rows.forEach(promo => {
      console.log(`ID ${promo.promocao_id}: "${promo.nome}" (${promo.usuarios_vinculados} usuários)`);
    });

    // Verificar correspondências entre staging e promoções
    console.log('\n🔗 ANÁLISE DE CORRESPONDÊNCIAS:');
    console.log('-'.repeat(50));
    
    const matchAnalysis = await pool.query(`
      SELECT 
        s.promocao_nome as nome_staging,
        COUNT(s.smartico_user_id) as registros_staging,
        p.promocao_id,
        p.nome as nome_promocao,
        CASE 
          WHEN p.promocao_id IS NOT NULL THEN 'MATCH'
          ELSE 'SEM CORRESPONDÊNCIA'
        END as status
      FROM staging_import s
      LEFT JOIN promocoes p ON TRIM(LOWER(p.nome)) = TRIM(LOWER(s.promocao_nome))
      GROUP BY s.promocao_nome, p.promocao_id, p.nome
      ORDER BY registros_staging DESC
    `);

    matchAnalysis.rows.forEach(match => {
      console.log(`"${match.nome_staging}" (${match.registros_staging} registros) → ${match.status}`);
      if (match.promocao_id) {
        console.log(`   Corresponde à promoção ID ${match.promocao_id}: "${match.nome_promocao}"`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkRecentImports();