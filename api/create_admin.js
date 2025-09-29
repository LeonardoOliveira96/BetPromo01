const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'betpromo_user',
  host: 'localhost',
  database: 'betpromo',
  password: 'betpromo_pass',
  port: 5432,
});

async function createAdmin() {
  try {
    console.log('🔍 Verificando se usuário admin existe...');
    
    // Verificar se o usuário admin já existe
    const checkUser = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      ['admin@admin.com']
    );

    if (checkUser.rows.length > 0) {
      console.log('✅ Usuário admin já existe');
      return;
    }

    console.log('👤 Criando usuário admin...');
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Criar usuário admin
    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, telefone, cpf, data_nascimento, endereco, cidade, estado, cep, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING id`,
      [
        'Administrador',
        'admin@admin.com',
        hashedPassword,
        '11999999999',
        '00000000000',
        '1990-01-01',
        'Rua Admin, 123',
        'São Paulo',
        'SP',
        '01234-567',
        'admin'
      ]
    );

    console.log('✅ Usuário admin criado com sucesso! ID:', result.rows[0].id);
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();