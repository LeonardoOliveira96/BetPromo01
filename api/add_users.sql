-- Script para adicionar campo role e inserir usuários
-- Executar no banco de dados betpromo

-- 1. Adicionar campo role à tabela admin_users
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- 2. Adicionar constraint para validar roles
ALTER TABLE admin_users 
ADD CONSTRAINT IF NOT EXISTS chk_admin_users_role 
CHECK (role IN ('admin', 'user'));

-- 3. Atualizar usuário existente para ter role admin
UPDATE admin_users 
SET role = 'admin' 
WHERE email = 'admin@betpromo.com';

-- 4. Inserir usuário comum: teste@teste.com
-- Hash bcrypt para 'senha123': $2b$10$N9qo8uLOickgx2ZMRZoMye.Fhvb4QLzO6T4Q3/aTtaOdjLxts9eTm
INSERT INTO admin_users (email, password_hash, name, role) 
VALUES ('teste@teste.com', '$2b$10$N9qo8uLOickgx2ZMRZoMye.Fhvb4QLzO6T4Q3/aTtaOdjLxts9eTm', 'Usuário Teste', 'user')
ON CONFLICT (email) DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 5. Inserir usuário admin: admin@teste.com
-- Hash bcrypt para 'senha123': $2b$10$N9qo8uLOickgx2ZMRZoMye.Fhvb4QLzO6T4Q3/aTtaOdjLxts9eTm
INSERT INTO admin_users (email, password_hash, name, role) 
VALUES ('admin@teste.com', '$2b$10$N9qo8uLOickgx2ZMRZoMye.Fhvb4QLzO6T4Q3/aTtaOdjLxts9eTm', 'Admin Teste', 'admin')
ON CONFLICT (email) DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 6. Verificar os usuários inseridos
SELECT id, email, name, role, is_active, created_at 
FROM admin_users 
ORDER BY created_at;