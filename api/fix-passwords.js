const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function fixPasswords() {
  console.log('Gerando hashes corretos para as senhas...');
  
  // Gerar hash para senha123
  const password = 'senha123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Senha:', password);
  console.log('Hash gerado:', hash);
  
  // Conectar ao banco de dados
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'betpromo',
    user: process.env.DB_USER || 'betpromo_user',
    password: process.env.DB_PASSWORD || 'betpromo_pass',
  });
  
  try {
    await client.connect();
    console.log('Conectado ao banco de dados');
    
    // Atualizar senha para teste@teste.com
    await client.query(
      'UPDATE admin_users SET password_hash = $1 WHERE email = $2',
      [hash, 'teste@teste.com']
    );
    console.log('Senha atualizada para teste@teste.com');
    
    // Atualizar senha para admin@teste.com
    await client.query(
      'UPDATE admin_users SET password_hash = $1 WHERE email = $2',
      [hash, 'admin@teste.com']
    );
    console.log('Senha atualizada para admin@teste.com');
    
    // Verificar se as atualizações foram bem-sucedidas
    const result = await client.query(
      'SELECT email, password_hash FROM admin_users WHERE email IN ($1, $2)',
      ['teste@teste.com', 'admin@teste.com']
    );
    
    console.log('\nUsuários atualizados:');
    result.rows.forEach(row => {
      console.log(`Email: ${row.email}`);
      console.log(`Hash: ${row.password_hash}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await client.end();
    console.log('Conexão fechada');
  }
}

fixPasswords();