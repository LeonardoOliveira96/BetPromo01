const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'betpromo',
  user: 'betpromo_user',
  password: 'betpromo_pass'
});

async function checkUser() {
  try {
    console.log('🔍 Investigando o usuário 65020400...\n');
    
    // 1. Verificar registros na staging
    console.log('📊 REGISTROS NA STAGING:');
    console.log('========================');
    const stagingResult = await pool.query(`
      SELECT promocao_nome, filename, import_date, processed
      FROM staging_import 
      WHERE smartico_user_id = 65020400
      ORDER BY import_date DESC
      LIMIT 5
    `);
    
    if (stagingResult.rows.length === 0) {
      console.log('❌ Nenhum registro encontrado na staging');
    } else {
      stagingResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.import_date}`);
        console.log(`   Promoção: "${row.promocao_nome}"`);
        console.log(`   Arquivo: ${row.filename}`);
        console.log(`   Processado: ${row.processed}`);
        console.log('');
      });
    }
    
    // 2. Verificar se o usuário existe na tabela final
    console.log('👤 USUÁRIO NA TABELA FINAL:');
    console.log('===========================');
    const userResult = await pool.query(`
      SELECT * FROM usuarios_final 
      WHERE smartico_user_id = 65020400
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário não encontrado na tabela usuarios_final');
    } else {
      console.log('✅ Usuário encontrado na tabela usuarios_final');
      const user = userResult.rows[0];
      console.log('   Colunas disponíveis:', Object.keys(user));
      console.log('   smartico_user_id:', user.smartico_user_id);
    }
    
    // 3. Explicação do problema
    console.log('\n💡 EXPLICAÇÃO DO PROBLEMA:');
    console.log('==========================');
    console.log('O usuário 65020400 está aparecendo apenas com "Promoção Padrão bet7k" porque:');
    console.log('');
    console.log('1. ❌ Este usuário NÃO foi incluído nos nossos testes de correção');
    console.log('2. ❌ Nossos testes usaram usuários fictícios: 888001, 888002, 888003');
    console.log('3. ✅ A correção está funcionando, mas apenas para NOVOS uploads');
    console.log('4. ✅ O usuário 65020400 mantém suas vinculações antigas');
    console.log('');
    console.log('🧪 PARA TESTAR A CORREÇÃO:');
    console.log('=========================');
    console.log('1. Crie uma nova promoção no frontend (ex: "Teste Final")');
    console.log('2. Faça upload de um CSV que INCLUA o usuário 65020400');
    console.log('3. Verifique se ele é vinculado à nova promoção');
    console.log('');
    console.log('📝 Exemplo de CSV para teste:');
    console.log('id_usuario,promocao_nome');
    console.log('65020400,Promoção Padrão bet7k');
    console.log('');
    console.log('✅ Com a correção, ele será vinculado à promoção "Teste Final"');
    console.log('   em vez de "Promoção Padrão bet7k"');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkUser();