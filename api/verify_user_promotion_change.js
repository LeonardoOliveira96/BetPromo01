const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'betpromo',
  user: 'betpromo_user',
  password: 'betpromo_pass',
});

async function verifyUserPromotionChange() {
  console.log('🔍 Verificando mudança de promoção do usuário 65020400...\n');

  try {
    // Verificar todas as vinculações do usuário 65020400
    const userPromotionsQuery = `
      SELECT 
        up.smartico_user_id,
        p.nome as promocao_nome,
        up.status,
        up.created_at,
        up.updated_at
      FROM usuario_promocao up
      JOIN promocoes p ON up.promocao_id = p.promocao_id
      WHERE up.smartico_user_id = '65020400'
      ORDER BY up.updated_at DESC
    `;

    const userPromotions = await pool.query(userPromotionsQuery);

    console.log('🎯 TODAS AS VINCULAÇÕES DO USUÁRIO 65020400:');
    console.log('=============================================');
    
    if (userPromotions.rows.length === 0) {
      console.log('❌ Nenhuma vinculação encontrada para o usuário 65020400');
    } else {
      userPromotions.rows.forEach((row, index) => {
        const statusIcon = row.status === 'active' ? '✅' : '❌';
        console.log(`${index + 1}. ${statusIcon} ${row.promocao_nome}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Criado em: ${row.created_at}`);
        console.log(`   Atualizado em: ${row.updated_at}`);
        console.log('');
      });
    }

    // Verificar vinculações ativas
    const activePromotionsQuery = `
      SELECT 
        p.nome as promocao_nome,
        up.created_at,
        up.updated_at
      FROM usuario_promocao up
      JOIN promocoes p ON up.promocao_id = p.promocao_id
      WHERE up.smartico_user_id = '65020400'
        AND up.status = 'active'
      ORDER BY up.updated_at DESC
    `;

    const activePromotions = await pool.query(activePromotionsQuery);

    console.log('🟢 PROMOÇÕES ATIVAS DO USUÁRIO 65020400:');
    console.log('=========================================');
    
    if (activePromotions.rows.length === 0) {
      console.log('❌ Nenhuma promoção ativa encontrada');
    } else {
      activePromotions.rows.forEach((row, index) => {
        console.log(`${index + 1}. ✅ ${row.promocao_nome}`);
        console.log(`   Criado em: ${row.created_at}`);
        console.log(`   Atualizado em: ${row.updated_at}`);
        console.log('');
      });
    }

    // Verificar registros na staging
    const stagingQuery = `
      SELECT 
        promocao_nome,
        import_date,
        filename,
        processed
      FROM staging_import 
      WHERE smartico_user_id = '65020400'
      ORDER BY import_date DESC
      LIMIT 5
    `;

    const stagingResult = await pool.query(stagingQuery);

    console.log('📋 ÚLTIMOS REGISTROS NA STAGING:');
    console.log('=================================');
    
    stagingResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.promocao_nome}`);
      console.log(`   Data: ${row.import_date}`);
      console.log(`   Arquivo: ${row.filename}`);
      console.log(`   Processado: ${row.processed ? '✅' : '❌'}`);
      console.log('');
    });

    console.log('💡 ANÁLISE:');
    console.log('===========');
    
    const hasNewPromotion = activePromotions.rows.some(row => 
      row.promocao_nome === 'NOVA PROMOÇÃO PARA USUÁRIOS EXISTENTES'
    );
    
    if (hasNewPromotion) {
      console.log('✅ SUCESSO! O usuário 65020400 foi movido para a nova promoção!');
      console.log('✅ A correção está funcionando perfeitamente!');
      console.log('✅ Usuários existentes agora são vinculados à nova promoção!');
    } else {
      console.log('❌ O usuário ainda não foi movido para a nova promoção');
      console.log('❌ Pode haver um problema na correção');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verifyUserPromotionChange();