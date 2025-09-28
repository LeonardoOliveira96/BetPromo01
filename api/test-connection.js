const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'betpromo',
  user: process.env.DB_USER || 'betpromo_user',
  password: process.env.DB_PASSWORD || 'betpromo_pass',
  connectionTimeoutMillis: 10000,
  query_timeout: 30000,
  statement_timeout: 30000,
});

async function testConnection() {
  console.log('🔄 Testando conexão com PostgreSQL...');
  console.log('Configurações:');
  console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  Port: ${process.env.DB_PORT || '5432'}`);
  console.log(`  Database: ${process.env.DB_NAME || 'betpromo'}`);
  console.log(`  User: ${process.env.DB_USER || 'betpromo_user'}`);
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW(), version()');
    client.release();
    
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log(`📅 Timestamp: ${result.rows[0].now}`);
    console.log(`🗄️  Versão: ${result.rows[0].version}`);
    
    // Teste adicional: verificar tabelas
    const client2 = await pool.connect();
    const tables = await client2.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    client2.release();
    
    console.log('📋 Tabelas disponíveis:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testConnection();