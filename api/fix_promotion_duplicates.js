const { Pool } = require('pg');

const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function fixPromotionDuplicates() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Iniciando correção de promoções duplicadas...\n');
    
    // 1. Verificar se já existe constraint UNIQUE
    console.log('📋 1. Verificando constraints existentes na tabela promocoes:');
    const constraints = await client.query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'promocoes'::regclass
    `);
    
    console.log('📝 CONSTRAINTS ATUAIS:');
    constraints.rows.forEach(c => {
      console.log(`- ${c.constraint_name} (${c.constraint_type}): ${c.definition}`);
    });
    
    const hasUniqueNome = constraints.rows.some(c => 
      c.definition.includes('UNIQUE') && c.definition.includes('nome')
    );
    
    if (hasUniqueNome) {
      console.log('✅ Constraint UNIQUE na coluna nome já existe');
    } else {
      console.log('❌ Constraint UNIQUE na coluna nome NÃO existe - isso explica o problema!');
    }
    
    // 2. Identificar e limpar duplicatas
    console.log('\n📋 2. Identificando promoções duplicadas para limpeza:');
    const duplicates = await client.query(`
      SELECT 
        nome,
        COUNT(*) as quantidade,
        ARRAY_AGG(promocao_id ORDER BY created_at) as ids,
        MIN(created_at) as primeira_criacao
      FROM promocoes 
      GROUP BY nome 
      HAVING COUNT(*) > 1
      ORDER BY quantidade DESC
    `);
    
    if (duplicates.rows.length > 0) {
      console.log('⚠️ PROMOÇÕES DUPLICADAS ENCONTRADAS:');
      
      await client.query('BEGIN');
      
      for (const dup of duplicates.rows) {
        console.log(`\n🔄 Processando "${dup.nome}" (${dup.quantidade} duplicatas):`);
        
        // Manter apenas a primeira promoção (mais antiga)
        const idsToKeep = dup.ids[0];
        const idsToRemove = dup.ids.slice(1);
        
        console.log(`  - Mantendo ID: ${idsToKeep}`);
        console.log(`  - Removendo IDs: ${idsToRemove.join(', ')}`);
        
        // 1. Atualizar vínculos para apontar para a promoção que será mantida
        for (const idToRemove of idsToRemove) {
          const updateResult = await client.query(`
            UPDATE usuario_promocao 
            SET promocao_id = $1 
            WHERE promocao_id = $2
            AND NOT EXISTS (
              SELECT 1 FROM usuario_promocao up2 
              WHERE up2.smartico_user_id = usuario_promocao.smartico_user_id 
              AND up2.promocao_id = $1
            )
          `, [idsToKeep, idToRemove]);
          
          console.log(`    - Atualizados ${updateResult.rowCount} vínculos do ID ${idToRemove} para ${idsToKeep}`);
          
          // 2. Remover vínculos duplicados que não puderam ser atualizados
          const deleteLinksResult = await client.query(`
            DELETE FROM usuario_promocao 
            WHERE promocao_id = $1
          `, [idToRemove]);
          
          console.log(`    - Removidos ${deleteLinksResult.rowCount} vínculos duplicados do ID ${idToRemove}`);
        }
        
        // 3. Remover promoções duplicadas
        const deletePromosResult = await client.query(`
          DELETE FROM promocoes 
          WHERE promocao_id = ANY($1)
        `, [idsToRemove]);
        
        console.log(`    - Removidas ${deletePromosResult.rowCount} promoções duplicadas`);
      }
      
      await client.query('COMMIT');
      console.log('\n✅ Limpeza de duplicatas concluída!');
      
    } else {
      console.log('✅ Nenhuma promoção duplicada encontrada');
    }
    
    // 3. Adicionar constraint UNIQUE se não existir
    if (!hasUniqueNome) {
      console.log('\n📋 3. Adicionando constraint UNIQUE na coluna nome:');
      
      try {
        await client.query(`
          ALTER TABLE promocoes 
          ADD CONSTRAINT promocoes_nome_unique UNIQUE (nome)
        `);
        console.log('✅ Constraint UNIQUE adicionada com sucesso!');
      } catch (error) {
        console.error('❌ Erro ao adicionar constraint UNIQUE:', error.message);
        
        // Verificar se ainda há duplicatas
        const remainingDuplicates = await client.query(`
          SELECT nome, COUNT(*) as quantidade
          FROM promocoes 
          GROUP BY nome 
          HAVING COUNT(*) > 1
        `);
        
        if (remainingDuplicates.rows.length > 0) {
          console.log('⚠️ Ainda existem duplicatas. Execute o script novamente.');
        }
      }
    }
    
    // 4. Verificar estado final
    console.log('\n📋 4. Verificando estado final:');
    const finalState = await client.query(`
      SELECT 
        COUNT(*) as total_promocoes,
        COUNT(DISTINCT nome) as nomes_unicos
      FROM promocoes
    `);
    
    const finalDuplicates = await client.query(`
      SELECT COUNT(*) as duplicatas_restantes
      FROM (
        SELECT nome 
        FROM promocoes 
        GROUP BY nome 
        HAVING COUNT(*) > 1
      ) sub
    `);
    
    console.log(`📊 ESTADO FINAL:`);
    console.log(`- Total de promoções: ${finalState.rows[0].total_promocoes}`);
    console.log(`- Nomes únicos: ${finalState.rows[0].nomes_unicos}`);
    console.log(`- Duplicatas restantes: ${finalDuplicates.rows[0].duplicatas_restantes}`);
    
    if (finalDuplicates.rows[0].duplicatas_restantes === '0') {
      console.log('🎉 Problema de duplicação corrigido com sucesso!');
    } else {
      console.log('⚠️ Ainda existem duplicatas. Verifique manualmente.');
    }
    
    console.log('\n🎉 Correção concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ Erro no rollback:', rollbackError);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

fixPromotionDuplicates().catch(console.error);