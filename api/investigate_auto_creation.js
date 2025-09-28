const { Pool } = require('pg');

const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function investigateAutoCreation() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Investigando mecanismos automáticos de criação de promoções...\n');
    
    // 1. Verificar triggers na tabela promocoes
    console.log('📋 1. Verificando triggers na tabela promocoes:');
    const triggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'promocoes'
    `);
    
    if (triggers.rows.length > 0) {
      console.log('⚠️ TRIGGERS ENCONTRADOS:');
      triggers.rows.forEach(trigger => {
        console.log(`- ${trigger.trigger_name}: ${trigger.action_timing} ${trigger.event_manipulation}`);
        console.log(`  Ação: ${trigger.action_statement}`);
      });
    } else {
      console.log('✅ Nenhum trigger encontrado na tabela promocoes');
    }
    
    // 2. Verificar triggers na tabela staging_import
    console.log('\n📋 2. Verificando triggers na tabela staging_import:');
    const stagingTriggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'staging_import'
    `);
    
    if (stagingTriggers.rows.length > 0) {
      console.log('⚠️ TRIGGERS ENCONTRADOS:');
      stagingTriggers.rows.forEach(trigger => {
        console.log(`- ${trigger.trigger_name}: ${trigger.action_timing} ${trigger.event_manipulation}`);
        console.log(`  Ação: ${trigger.action_statement}`);
      });
    } else {
      console.log('✅ Nenhum trigger encontrado na tabela staging_import');
    }
    
    // 3. Verificar stored procedures/functions
    console.log('\n📋 3. Verificando functions/procedures relacionadas a promoções:');
    const functions = await client.query(`
      SELECT 
        routine_name,
        routine_type,
        routine_definition
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
        AND (routine_definition ILIKE '%promocoes%' 
             OR routine_definition ILIKE '%promotion%'
             OR routine_name ILIKE '%promocao%'
             OR routine_name ILIKE '%promotion%')
    `);
    
    if (functions.rows.length > 0) {
      console.log('⚠️ FUNCTIONS/PROCEDURES ENCONTRADAS:');
      functions.rows.forEach(func => {
        console.log(`- ${func.routine_name} (${func.routine_type})`);
        console.log(`  Definição: ${func.routine_definition.substring(0, 200)}...`);
      });
    } else {
      console.log('✅ Nenhuma function/procedure relacionada a promoções encontrada');
    }
    
    // 4. Verificar constraints que possam ter ações automáticas
    console.log('\n📋 4. Verificando constraints com ações automáticas:');
    const constraints = await client.query(`
      SELECT 
        constraint_name,
        constraint_type,
        table_name
      FROM information_schema.table_constraints 
      WHERE table_name IN ('promocoes', 'staging_import', 'usuario_promocao')
        AND constraint_type IN ('FOREIGN KEY', 'CHECK')
    `);
    
    if (constraints.rows.length > 0) {
      console.log('📝 CONSTRAINTS ENCONTRADAS:');
      constraints.rows.forEach(constraint => {
        console.log(`- ${constraint.constraint_name} (${constraint.constraint_type}) em ${constraint.table_name}`);
      });
    } else {
      console.log('✅ Nenhuma constraint especial encontrada');
    }
    
    // 5. Verificar se há jobs ou eventos agendados
    console.log('\n📋 5. Verificando extensões que podem criar jobs automáticos:');
    const extensions = await client.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname IN ('pg_cron', 'pg_agent', 'pgagent')
    `);
    
    if (extensions.rows.length > 0) {
      console.log('⚠️ EXTENSÕES DE AGENDAMENTO ENCONTRADAS:');
      extensions.rows.forEach(ext => {
        console.log(`- ${ext.extname} v${ext.extversion}`);
      });
    } else {
      console.log('✅ Nenhuma extensão de agendamento encontrada');
    }
    
    // 6. Verificar regras (rules) nas tabelas
    console.log('\n📋 6. Verificando regras (rules) nas tabelas:');
    const rules = await client.query(`
      SELECT 
        schemaname,
        tablename,
        rulename,
        definition
      FROM pg_rules 
      WHERE tablename IN ('promocoes', 'staging_import', 'usuario_promocao')
    `);
    
    if (rules.rows.length > 0) {
      console.log('⚠️ REGRAS ENCONTRADAS:');
      rules.rows.forEach(rule => {
        console.log(`- ${rule.rulename} em ${rule.tablename}`);
        console.log(`  Definição: ${rule.definition}`);
      });
    } else {
      console.log('✅ Nenhuma regra encontrada');
    }
    
    // 7. Verificar estado atual das tabelas
    console.log('\n📊 7. Estado atual das tabelas:');
    const promocoesCount = await client.query('SELECT COUNT(*) FROM promocoes');
    const stagingCount = await client.query('SELECT COUNT(*) FROM staging_import WHERE processed = false');
    const usuarioPromocaoCount = await client.query('SELECT COUNT(*) FROM usuario_promocao');
    const historicoCount = await client.query('SELECT COUNT(*) FROM usuario_promocao_historico');
    
    console.log(`- Promoções: ${promocoesCount.rows[0].count}`);
    console.log(`- Staging não processado: ${stagingCount.rows[0].count}`);
    console.log(`- Vínculos usuário-promoção: ${usuarioPromocaoCount.rows[0].count}`);
    console.log(`- Histórico: ${historicoCount.rows[0].count}`);
    
    // 8. Verificar últimas promoções criadas
    console.log('\n📋 8. Últimas promoções criadas:');
    const recentPromotions = await client.query(`
      SELECT promocao_id, nome, status, created_at 
      FROM promocoes 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (recentPromotions.rows.length > 0) {
      console.log('📝 PROMOÇÕES RECENTES:');
      recentPromotions.rows.forEach(promo => {
        console.log(`- ID ${promo.promocao_id}: "${promo.nome}" (${promo.status}) - ${promo.created_at}`);
      });
    } else {
      console.log('ℹ️ Nenhuma promoção encontrada');
    }
    
    console.log('\n🎉 Investigação concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a investigação:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

investigateAutoCreation().catch(console.error);