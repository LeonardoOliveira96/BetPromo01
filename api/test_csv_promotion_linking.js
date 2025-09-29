const { Pool } = require('pg');

const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function testPromotionLinking() {
  try {
    console.log('🔍 Testando processo de vinculação de promoções...\n');

    // 1. Verificar dados na staging_import
    console.log('📋 DADOS NA STAGING_IMPORT:');
    console.log('===========================');
    const stagingResult = await pool.query(`
      SELECT 
        filename,
        promocao_nome,
        COUNT(*) as total_registros,
        COUNT(DISTINCT smartico_user_id) as usuarios_unicos
      FROM staging_import 
      GROUP BY filename, promocao_nome
      ORDER BY filename DESC
      LIMIT 10
    `);

    stagingResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. Arquivo: ${row.filename}`);
      console.log(`   Promoção: ${row.promocao_nome}`);
      console.log(`   Total registros: ${row.total_registros}`);
      console.log(`   Usuários únicos: ${row.usuarios_unicos}`);
      console.log('   ---');
    });

    // 2. Verificar se as promoções existem na tabela promocoes
    console.log('\n🎯 PROMOÇÕES NA TABELA PROMOCOES:');
    console.log('=================================');
    const promotionsResult = await pool.query(`
      SELECT 
        promocao_id,
        nome,
        created_at,
        status
      FROM promocoes 
      ORDER BY created_at DESC
    `);

    promotionsResult.rows.forEach((promo, index) => {
      console.log(`${index + 1}. ID: ${promo.promocao_id}`);
      console.log(`   Nome: ${promo.nome}`);
      console.log(`   Status: ${promo.status}`);
      console.log(`   Criada em: ${promo.created_at}`);
      console.log('   ---');
    });

    // 3. Testar a query de vinculação que deveria funcionar
    console.log('\n🔗 TESTANDO QUERY DE VINCULAÇÃO:');
    console.log('================================');
    
    // Pegar o último arquivo processado
    const lastFileResult = await pool.query(`
      SELECT DISTINCT filename 
      FROM staging_import 
      ORDER BY filename DESC 
      LIMIT 1
    `);

    if (lastFileResult.rows.length > 0) {
      const filename = lastFileResult.rows[0].filename;
      console.log(`Testando com arquivo: ${filename}`);

      // Simular a query de vinculação
      const linkingQuery = `
        SELECT 
          s.smartico_user_id,
          s.promocao_nome,
          p.promocao_id,
          p.nome as promocao_nome_tabela,
          CASE 
            WHEN p.promocao_id IS NULL THEN 'PROMOÇÃO NÃO ENCONTRADA'
            ELSE 'PROMOÇÃO ENCONTRADA'
          END as status_match
        FROM staging_import s
        LEFT JOIN promocoes p ON s.promocao_nome = p.nome
        WHERE s.filename = $1
        LIMIT 10
      `;

      const linkingResult = await pool.query(linkingQuery, [filename]);
      
      console.log('Resultado da query de vinculação:');
      linkingResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. Usuário: ${row.smartico_user_id}`);
        console.log(`   Promoção no CSV: "${row.promocao_nome}"`);
        console.log(`   Promoção na tabela: "${row.promocao_nome_tabela || 'NULL'}"`);
        console.log(`   Status: ${row.status_match}`);
        console.log('   ---');
      });

      // 4. Verificar vínculos existentes para este arquivo
      console.log('\n📊 VÍNCULOS EXISTENTES PARA ESTE ARQUIVO:');
      console.log('=========================================');
      const existingLinksQuery = `
        SELECT 
          up.smartico_user_id,
          up.promocao_id,
          p.nome as promocao_nome,
          up.created_at
        FROM usuario_promocao up
        JOIN promocoes p ON up.promocao_id = p.promocao_id
        WHERE up.smartico_user_id IN (
          SELECT DISTINCT smartico_user_id 
          FROM staging_import 
          WHERE filename = $1
        )
        ORDER BY up.created_at DESC
        LIMIT 10
      `;

      const existingLinksResult = await pool.query(existingLinksQuery, [filename]);
      
      if (existingLinksResult.rows.length > 0) {
        existingLinksResult.rows.forEach((link, index) => {
          console.log(`${index + 1}. Usuário: ${link.smartico_user_id}`);
          console.log(`   Promoção: ${link.promocao_nome} (ID: ${link.promocao_id})`);
          console.log(`   Criado em: ${link.created_at}`);
          console.log('   ---');
        });
      } else {
        console.log('❌ Nenhum vínculo encontrado para usuários deste arquivo!');
      }
    } else {
      console.log('❌ Nenhum arquivo encontrado na staging_import');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

testPromotionLinking();