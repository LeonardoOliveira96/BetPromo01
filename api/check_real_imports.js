const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function checkRealImports() {
  try {
    console.log('🔍 VERIFICANDO IMPORTAÇÕES REAIS DO FRONTEND');
    console.log('='.repeat(60));

    // Verificar todos os registros na staging_import
    const allImports = await pool.query(`
      SELECT 
        promocao_nome,
        filename,
        COUNT(*) as total_registros,
        MIN(import_date) as primeira_importacao,
        MAX(import_date) as ultima_importacao
      FROM staging_import 
      GROUP BY promocao_nome, filename
      ORDER BY ultima_importacao DESC
    `);

    console.log('\n📥 TODAS AS IMPORTAÇÕES POR ARQUIVO:');
    console.log('-'.repeat(60));
    
    if (allImports.rows.length === 0) {
      console.log('❌ Nenhuma importação encontrada');
    } else {
      allImports.rows.forEach((row, index) => {
        console.log(`${index + 1}. Arquivo: ${row.filename}`);
        console.log(`   Promoção: "${row.promocao_nome}"`);
        console.log(`   Registros: ${row.total_registros}`);
        console.log(`   Primeira: ${row.primeira_importacao}`);
        console.log(`   Última: ${row.ultima_importacao}`);
        console.log('');
      });
    }

    // Verificar se há arquivos que não são de teste
    const realImports = await pool.query(`
      SELECT 
        promocao_nome,
        filename,
        COUNT(*) as total_registros
      FROM staging_import 
      WHERE filename NOT LIKE '%test%'
      AND filename NOT LIKE '%Test%'
      AND filename NOT LIKE '%TEST%'
      GROUP BY promocao_nome, filename
      ORDER BY total_registros DESC
    `);

    console.log('\n📋 IMPORTAÇÕES REAIS (não de teste):');
    console.log('-'.repeat(60));
    
    if (realImports.rows.length === 0) {
      console.log('❌ Nenhuma importação real encontrada');
      console.log('💡 Isso significa que todas as importações foram de teste');
    } else {
      realImports.rows.forEach((row, index) => {
        console.log(`${index + 1}. Arquivo: ${row.filename}`);
        console.log(`   Promoção: "${row.promocao_nome}"`);
        console.log(`   Registros: ${row.total_registros}`);
        console.log('');
      });
    }

    // Verificar usuários reais (não de teste)
    const realUsers = await pool.query(`
      SELECT COUNT(*) as total_usuarios_reais
      FROM usuarios_final 
      WHERE smartico_user_id < 888000
      AND smartico_user_id < 999000
    `);

    console.log('\n👥 USUÁRIOS REAIS:');
    console.log('-'.repeat(30));
    console.log(`Total de usuários reais: ${realUsers.rows[0].total_usuarios_reais}`);

    // Verificar vinculações de usuários reais
    const realUserPromotions = await pool.query(`
      SELECT 
        p.nome as promocao_nome,
        COUNT(up.smartico_user_id) as usuarios_vinculados
      FROM usuario_promocao up
      INNER JOIN promocoes p ON p.promocao_id = up.promocao_id
      WHERE up.smartico_user_id < 888000
      AND up.smartico_user_id < 999000
      GROUP BY p.promocao_id, p.nome
      ORDER BY usuarios_vinculados DESC
    `);

    console.log('\n🔗 VINCULAÇÕES DE USUÁRIOS REAIS:');
    console.log('-'.repeat(40));
    
    if (realUserPromotions.rows.length === 0) {
      console.log('❌ Nenhuma vinculação de usuário real encontrada');
    } else {
      realUserPromotions.rows.forEach(row => {
        console.log(`"${row.promocao_nome}": ${row.usuarios_vinculados} usuários`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkRealImports();