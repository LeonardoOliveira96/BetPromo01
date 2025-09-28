const { Pool } = require('pg');

const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function checkStagingStructure() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estrutura da tabela staging_import...\n');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'staging_import'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estrutura da tabela staging_import:');
    console.log('┌─────────────────────────┬─────────────────┬─────────────┬─────────────────┐');
    console.log('│ Column Name             │ Data Type       │ Nullable    │ Default         │');
    console.log('├─────────────────────────┼─────────────────┼─────────────┼─────────────────┤');
    
    result.rows.forEach(row => {
      const columnName = row.column_name.padEnd(23);
      const dataType = row.data_type.padEnd(15);
      const nullable = row.is_nullable.padEnd(11);
      const defaultValue = (row.column_default || 'NULL').padEnd(15);
      console.log(`│ ${columnName} │ ${dataType} │ ${nullable} │ ${defaultValue} │`);
    });
    
    console.log('└─────────────────────────┴─────────────────┴─────────────┴─────────────────┘');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkStagingStructure().catch(console.error);