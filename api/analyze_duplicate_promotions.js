const { Pool } = require('pg');

const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function analyzeDuplicatePromotions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Analisando promoções duplicadas...\n');
    
    // 1. Identificar promoções duplicadas
    console.log('📋 1. Identificando promoções com nomes duplicados:');
    const duplicates = await client.query(`
      SELECT 
        nome,
        COUNT(*) as quantidade,
        STRING_AGG(promocao_id::text, ', ') as ids,
        MIN(created_at) as primeira_criacao,
        MAX(created_at) as ultima_criacao
      FROM promocoes 
      GROUP BY nome 
      HAVING COUNT(*) > 1
      ORDER BY quantidade DESC, primeira_criacao DESC
    `);
    
    if (duplicates.rows.length > 0) {
      console.log('⚠️ PROMOÇÕES DUPLICADAS ENCONTRADAS:');
      duplicates.rows.forEach(dup => {
        console.log(`- "${dup.nome}": ${dup.quantidade} ocorrências`);
        console.log(`  IDs: ${dup.ids}`);
        console.log(`  Primeira: ${dup.primeira_criacao}`);
        console.log(`  Última: ${dup.ultima_criacao}`);
        console.log('');
      });
    } else {
      console.log('✅ Nenhuma promoção duplicada encontrada');
    }
    
    // 2. Analisar histórico de importações recentes
    console.log('📋 2. Analisando histórico de importações recentes:');
    const recentImports = await client.query(`
      SELECT DISTINCT filename, import_date, COUNT(*) as registros
      FROM staging_import 
      WHERE import_date >= NOW() - INTERVAL '24 hours'
      GROUP BY filename, import_date
      ORDER BY import_date DESC
    `);
    
    if (recentImports.rows.length > 0) {
      console.log('📝 IMPORTAÇÕES RECENTES (últimas 24h):');
      recentImports.rows.forEach(imp => {
        console.log(`- ${imp.filename}: ${imp.registros} registros em ${imp.import_date}`);
      });
    } else {
      console.log('ℹ️ Nenhuma importação recente encontrada');
    }
    
    // 3. Verificar se há dados não processados no staging
    console.log('\n📋 3. Verificando dados não processados no staging:');
    const unprocessed = await client.query(`
      SELECT 
        filename,
        promocao_nome,
        COUNT(*) as quantidade,
        MIN(import_date) as primeira_importacao
      FROM staging_import 
      WHERE processed = false
      GROUP BY filename, promocao_nome
      ORDER BY primeira_importacao DESC
    `);
    
    if (unprocessed.rows.length > 0) {
      console.log('⚠️ DADOS NÃO PROCESSADOS ENCONTRADOS:');
      unprocessed.rows.forEach(up => {
        console.log(`- ${up.filename}: "${up.promocao_nome}" (${up.quantidade} registros)`);
      });
    } else {
      console.log('✅ Todos os dados do staging foram processados');
    }
    
    // 4. Verificar padrão de criação das promoções "bet7k"
    console.log('\n📋 4. Analisando padrão das promoções "bet7k":');
    const bet7kPromotions = await client.query(`
      SELECT 
        promocao_id,
        nome,
        regras,
        data_inicio,
        data_fim,
        status,
        created_at
      FROM promocoes 
      WHERE nome ILIKE '%bet7k%'
      ORDER BY created_at DESC
    `);
    
    if (bet7kPromotions.rows.length > 0) {
      console.log('📝 PROMOÇÕES BET7K:');
      bet7kPromotions.rows.forEach(promo => {
        console.log(`- ID ${promo.promocao_id}: "${promo.nome}"`);
        console.log(`  Regras: ${promo.regras}`);
        console.log(`  Período: ${promo.data_inicio} até ${promo.data_fim}`);
        console.log(`  Status: ${promo.status}, Criada: ${promo.created_at}`);
        console.log('');
      });
    }
    
    // 5. Verificar vínculos dessas promoções duplicadas
    console.log('📋 5. Verificando vínculos das promoções duplicadas:');
    if (duplicates.rows.length > 0) {
      for (const dup of duplicates.rows) {
        const ids = dup.ids.split(', ');
        console.log(`\n🔗 Vínculos para "${dup.nome}":`);
        
        for (const id of ids) {
          const links = await client.query(`
            SELECT COUNT(*) as usuarios_vinculados
            FROM usuario_promocao 
            WHERE promocao_id = $1
          `, [id]);
          
          console.log(`  - ID ${id}: ${links.rows[0].usuarios_vinculados} usuários vinculados`);
        }
      }
    }
    
    // 6. Verificar se há problema no código de criação
    console.log('\n📋 6. Verificando lógica de prevenção de duplicatas:');
    
    // Simular a query que deveria prevenir duplicatas
    const preventionTest = await client.query(`
      SELECT nome FROM promocoes WHERE nome = 'Promoção Padrão bet7k'
    `);
    
    console.log(`Teste de prevenção: ${preventionTest.rows.length} promoções encontradas com nome "Promoção Padrão bet7k"`);
    
    if (preventionTest.rows.length > 1) {
      console.log('❌ PROBLEMA: A lógica de prevenção de duplicatas não está funcionando!');
      console.log('   A condição "AND promocao_nome NOT IN (SELECT nome FROM promocoes)" deveria prevenir isso.');
    }
    
    // 7. Propor solução
    console.log('\n💡 ANÁLISE E RECOMENDAÇÕES:');
    
    if (duplicates.rows.length > 0) {
      console.log('🔧 PROBLEMAS IDENTIFICADOS:');
      console.log('1. Múltiplas promoções com o mesmo nome foram criadas simultaneamente');
      console.log('2. Isso sugere que o processamento CSV pode estar executando em paralelo');
      console.log('3. Ou há uma condição de corrida (race condition) no código');
      
      console.log('\n🛠️ SOLUÇÕES RECOMENDADAS:');
      console.log('1. Adicionar UNIQUE constraint na coluna "nome" da tabela promocoes');
      console.log('2. Usar UPSERT (ON CONFLICT) em vez de verificação manual');
      console.log('3. Implementar lock de transação durante criação de promoções');
      console.log('4. Limpar promoções duplicadas existentes');
    } else {
      console.log('✅ Nenhum problema de duplicação ativo encontrado');
    }
    
    console.log('\n🎉 Análise concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a análise:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

analyzeDuplicatePromotions().catch(console.error);