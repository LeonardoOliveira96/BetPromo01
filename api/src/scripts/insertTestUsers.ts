import { query } from '../config/database';
import { hashPassword } from '../utils/auth';

/**
 * Script para inserir usuários de teste no banco de dados
 * Usuários: teste@teste.com e admin@teste.com (ambos com senha: senha123)
 */

interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
}

const testUsers: TestUser[] = [
  {
    email: 'teste@teste.com',
    password: 'senha123',
    name: 'Usuário Teste',
    role: 'user'
  },
  {
    email: 'admin@teste.com',
    password: 'senha123',
    name: 'Administrador Teste',
    role: 'admin'
  }
];

async function insertTestUsers(): Promise<void> {
  try {
    console.log('🔄 Iniciando inserção de usuários de teste...');
    
    // Primeiro, adicionar a coluna role se não existir
    console.log('Adicionando coluna role se não existir...');
    await query(`
      ALTER TABLE admin_users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'
    `);

    for (const user of testUsers) {
      // Gera hash da senha
      const passwordHash = await hashPassword(user.password);

      // Verifica se o usuário já existe
      const existingUser = await query(
        'SELECT id FROM admin_users WHERE email = $1',
        [user.email]
      );

      if (existingUser.rows.length > 0) {
        console.log(`⚠️  Usuário ${user.email} já existe, atualizando senha...`);
        
        // Atualiza a senha do usuário existente
        await query(
          'UPDATE admin_users SET password_hash = $1, name = $2, role = $3, updated_at = NOW() WHERE email = $4',
          [passwordHash, user.name, user.role, user.email]
        );
        
        console.log(`✅ Usuário ${user.email} atualizado com sucesso!`);
      } else {
        // Insere novo usuário
        await query(
          'INSERT INTO admin_users (email, password_hash, name, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, true, NOW(), NOW())',
          [user.email, passwordHash, user.name, user.role]
        );
        
        console.log(`✅ Usuário ${user.email} criado com sucesso!`);
      }
    }

    console.log('🎉 Todos os usuários de teste foram inseridos/atualizados com sucesso!');
    console.log('\n📋 Credenciais de teste:');
    console.log('👤 Usuário: teste@teste.com / senha123');
    console.log('🔑 Admin: admin@teste.com / senha123');
    
  } catch (error) {
    console.error('❌ Erro ao inserir usuários de teste:', error);
    throw error;
  }
}

// Executa o script se for chamado diretamente
if (require.main === module) {
  insertTestUsers()
    .then(() => {
      console.log('✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na execução do script:', error);
      process.exit(1);
    });
}

export { insertTestUsers };