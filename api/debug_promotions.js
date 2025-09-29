const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'betpromo',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function checkUserPromotions() {
  try {
    // Vamos procurar usuários que tenham múltiplas promoções
    console.log('🔍 Procurando usuários com múltiplas promoções...');
    const multiPromotionsQuery = `
      SELECT 
        u.smartico_user_id,
        u.user_ext_id,
        COUNT(up.promocao_id) as total_promocoes
      FROM usuarios_final u
      LEFT JOIN usuario_promocao up ON u.smartico_user_id = up.smartico_user_id
      GROUP BY u.smartico_user_id, u.user_ext_id
      HAVING COUNT(up.promocao_id) > 1
      ORDER BY COUNT(up.promocao_id) DESC
      LIMIT 5
    `;
    
    const multiResult = await pool.query(multiPromotionsQuery);
    console.log('📊 Usuários com múltiplas promoções:');
    multiResult.rows.forEach(user => {
      console.log(`  - ID: ${user.smartico_user_id}, Ext ID: ${user.user_ext_id}, Total: ${user.total_promocoes}`);
    });
    
    if (multiResult.rows.length > 0) {
      const userId = multiResult.rows[0].smartico_user_id;
      console.log(`\n🔍 Verificando promoções detalhadas para usuário ${userId}:`);
      
      // Query para ver todas as promoções do usuário
      const promotionsQuery = `
        SELECT 
          u.smartico_user_id,
          u.user_ext_id,
          p.promocao_id,
          p.nome as promocao_nome,
          up.data_inicio,
          up.data_fim,
          up.status,
          up.data_vinculo
        FROM usuarios_final u
        LEFT JOIN usuario_promocao up ON u.smartico_user_id = up.smartico_user_id
        LEFT JOIN promocoes p ON up.promocao_id = p.promocao_id
        WHERE u.smartico_user_id = $1
        ORDER BY up.data_vinculo DESC
      `;
      
      const result = await pool.query(promotionsQuery, [userId]);
      console.log(`📊 Total de registros encontrados: ${result.rows.length}`);
      
      result.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. Promoção: ${row.promocao_nome || 'NULL'}`);
        console.log(`     Status: ${row.status || 'NULL'}`);
        console.log(`     Data início: ${row.data_inicio || 'NULL'}`);
        console.log(`     Data fim: ${row.data_fim || 'NULL'}`);
        console.log('');
      });
      
      // Agora vamos testar a query que está sendo usada no SearchService
      console.log('🔍 Testando query do SearchService:');
      const searchQuery = `
        SELECT 
          u.smartico_user_id,
          u.user_ext_id,
          u.core_sm_brand_id,
          u.crm_brand_id,
          u.ext_brand_id,
          u.crm_brand_name,
          u.created_at,
          u.updated_at,
          COALESCE(
            ARRAY_AGG(
              DISTINCT p.nome
              ORDER BY p.nome
            ) FILTER (WHERE p.nome IS NOT NULL),
            ARRAY[]::text[]
          ) as current_promotions
        FROM usuarios_final u
        LEFT JOIN usuario_promocao up ON u.smartico_user_id = up.smartico_user_id
        LEFT JOIN promocoes p ON up.promocao_id = p.promocao_id
        WHERE u.smartico_user_id = $1
        GROUP BY 
          u.smartico_user_id,
          u.user_ext_id,
          u.core_sm_brand_id,
          u.crm_brand_id,
          u.ext_brand_id,
          u.crm_brand_name,
          u.created_at,
          u.updated_at
      `;
      
      const searchResult = await pool.query(searchQuery, [userId]);
      console.log('📊 Resultado da query do SearchService:');
      console.log(JSON.stringify(searchResult.rows[0], null, 2));
    } else {
      console.log('❌ Nenhum usuário com múltiplas promoções encontrado');
      
      // Vamos verificar o total de promoções no sistema
      const totalPromotionsQuery = 'SELECT COUNT(*) as total FROM promocoes';
      const totalResult = await pool.query(totalPromotionsQuery);
      console.log(`📊 Total de promoções no sistema: ${totalResult.rows[0].total}`);
      
      // Vamos verificar o total de vínculos usuário-promoção
      const totalLinksQuery = 'SELECT COUNT(*) as total FROM usuario_promocao';
      const totalLinksResult = await pool.query(totalLinksQuery);
      console.log(`📊 Total de vínculos usuário-promoção: ${totalLinksResult.rows[0].total}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkUserPromotions();