const { Pool } = require('pg');
require('dotenv').config();

// Configuração da conexão com o banco de dados
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'betpromo',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function clearDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando limpeza do banco de dados...');
    
    // Desabilitar verificações de chave estrangeira temporariamente
    await client.query('SET session_replication_role = replica;');
    
    // Lista de tabelas para limpar (todas exceto admin_users)
    const tablesToClear = [
      'staging_import',
      'usuario_promocao_historico', 
      'usuario_promocao',
      'usuarios_final',
      'promocoes'
    ];
    
    // Limpar cada tabela
    for (const table of tablesToClear) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`✅ Tabela '${table}' limpa - ${result.rowCount} registros removidos`);
      } catch (error) {
        console.error(`❌ Erro ao limpar tabela '${table}':`, error.message);
      }
    }
    
    // Resetar sequências (auto-increment) das tabelas limpas
    const sequencesToReset = [
      'promocoes_promocao_id_seq',
      'staging_import_id_seq',
      'usuario_promocao_historico_id_seq'
    ];
    
    for (const sequence of sequencesToReset) {
      try {
        await client.query(`ALTER SEQUENCE ${sequence} RESTART WITH 1`);
        console.log(`🔄 Sequência '${sequence}' resetada`);
      } catch (error) {
        console.error(`⚠️  Aviso: Não foi possível resetar sequência '${sequence}':`, error.message);
      }
    }
    
    // Reabilitar verificações de chave estrangeira
    await client.query('SET session_replication_role = DEFAULT;');
    
    // Verificar quantos registros restaram na tabela de usuários administrativos
    const adminUsersResult = await client.query('SELECT COUNT(*) FROM admin_users');
    console.log(`👤 Usuários administrativos preservados: ${adminUsersResult.rows[0].count}`);
    
    console.log('✨ Limpeza do banco de dados concluída com sucesso!');
    console.log('📋 Resumo:');
    console.log('   - Todas as tabelas foram limpas exceto admin_users');
    console.log('   - Sequências foram resetadas');
    console.log('   - Usuários administrativos foram preservados');
    
  } catch (error) {
    console.error('💥 Erro durante a limpeza do banco de dados:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function confirmAndExecute() {
  console.log('⚠️  ATENÇÃO: Este script irá limpar TODOS os dados das seguintes tabelas:');
  console.log('   - usuarios_final');
  console.log('   - promocoes');
  console.log('   - usuario_promocao');
  console.log('   - usuario_promocao_historico');
  console.log('   - staging_import');
  console.log('');
  console.log('✅ A tabela admin_users será PRESERVADA');
  console.log('');
  
  // Se executado com argumento --force, pula a confirmação
  if (process.argv.includes('--force')) {
    await clearDatabase();
    process.exit(0);
  }
  
  // Aguardar confirmação do usuário
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Deseja continuar? (digite "CONFIRMAR" para prosseguir): ', async (answer) => {
    if (answer === 'CONFIRMAR') {
      try {
        await clearDatabase();
        console.log('🎉 Operação concluída!');
      } catch (error) {
        console.error('❌ Falha na operação:', error.message);
        process.exit(1);
      }
    } else {
      console.log('❌ Operação cancelada pelo usuário');
    }
    rl.close();
    process.exit(0);
  });
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  confirmAndExecute().catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { clearDatabase };