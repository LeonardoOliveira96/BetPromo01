const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'betpromo',
  user: 'betpromo_user',
  password: 'betpromo_pass',
});

async function verifyPromotionNameTest() {
  console.log('🔍 Verificando se o teste com promotionName funcionou...\n');

  try {
    // 1. Verificar se a promoção foi criada
    console.log('📋 Verificando promoções criadas:');
    const promotionsResult = await pool.query(`
      SELECT promocao_id, nome, status, created_at 
      FROM promocoes 
      WHERE nome LIKE '%TESTE COM PROMOTION NAME%'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('Promoções encontradas:');
    promotionsResult.rows.forEach(promo => {
      console.log(`- ID: ${promo.promocao_id}, Nome: "${promo.nome}", Status: ${promo.status}`);
    });
    console.log('');

    if (promotionsResult.rows.length === 0) {
      console.log('❌ Nenhuma promoção com o nome esperado foi encontrada!');
      return;
    }

    const targetPromotion = promotionsResult.rows[0];
    console.log(`🎯 Promoção alvo: "${targetPromotion.nome}" (ID: ${targetPromotion.promocao_id})\n`);

    // 2. Verificar vinculações dos usuários de teste
    const testUsers = ['65020400', '65021174', '65021195'];
    
    for (const userId of testUsers) {
      console.log(`👤 Verificando usuário ${userId}:`);
      
      // Verificar vinculações ativas
      const activeResult = await pool.query(`
        SELECT up.*, p.nome as promocao_nome
        FROM usuario_promocao up
        JOIN promocoes p ON up.promocao_id = p.promocao_id
        WHERE up.smartico_user_id = $1 AND up.status = 'active'
        ORDER BY up.created_at DESC
      `, [userId]);

      console.log(`  Vinculações ativas: ${activeResult.rows.length}`);
      activeResult.rows.forEach(link => {
        console.log(`    - Promoção: "${link.promocao_nome}" (ID: ${link.promocao_id})`);
      });

      // Verificar se está vinculado à promoção correta
      const correctLink = activeResult.rows.find(link => 
        link.promocao_nome === 'TESTE COM PROMOTION NAME PREENCHIDO'
      );

      if (correctLink) {
        console.log(`  ✅ Usuário vinculado à promoção correta!`);
      } else {
        console.log(`  ❌ Usuário NÃO vinculado à promoção esperada!`);
      }

      // Verificar vinculações inativas (antigas)
      const inactiveResult = await pool.query(`
        SELECT up.*, p.nome as promocao_nome
        FROM usuario_promocao up
        JOIN promocoes p ON up.promocao_id = p.promocao_id
        WHERE up.smartico_user_id = $1 AND up.status = 'inactive'
        ORDER BY up.updated_at DESC
        LIMIT 3
      `, [userId]);

      if (inactiveResult.rows.length > 0) {
        console.log(`  📝 Vinculações antigas desativadas: ${inactiveResult.rows.length}`);
        inactiveResult.rows.forEach(link => {
          console.log(`    - "${link.promocao_nome}" (desativada)`);
        });
      }

      console.log('');
    }

    // 3. Resumo final
    console.log('📊 RESUMO DO TESTE:');
    
    const allActiveLinks = await pool.query(`
      SELECT COUNT(*) as count
      FROM usuario_promocao up
      JOIN promocoes p ON up.promocao_id = p.promocao_id
      WHERE p.nome = 'TESTE COM PROMOTION NAME PREENCHIDO' AND up.status = 'active'
    `);

    console.log(`- Usuários vinculados à nova promoção: ${allActiveLinks.rows[0].count}/3`);
    
    if (allActiveLinks.rows[0].count === '3') {
      console.log('✅ TESTE PASSOU: Todos os usuários foram vinculados à nova promoção!');
    } else {
      console.log('❌ TESTE FALHOU: Nem todos os usuários foram vinculados corretamente!');
    }

  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  } finally {
    await pool.end();
  }
}

verifyPromotionNameTest();