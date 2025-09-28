-- Script para limpar o banco de dados mantendo apenas usuários administrativos
-- Este script remove todos os dados exceto da tabela admin_users

-- Desabilitar verificações de chave estrangeira temporariamente
SET session_replication_role = replica;

-- Limpar tabelas na ordem correta (respeitando dependências)
-- 1. Primeiro as tabelas que referenciam outras
TRUNCATE TABLE usuario_promocao CASCADE;
TRUNCATE TABLE usuario_promocao_historico CASCADE;
TRUNCATE TABLE staging_import CASCADE;

-- 2. Depois as tabelas principais
TRUNCATE TABLE usuarios_final CASCADE;
TRUNCATE TABLE promocoes CASCADE;

-- Reabilitar verificações de chave estrangeira
SET session_replication_role = DEFAULT;

-- Resetar sequências para começar do 1 novamente
ALTER SEQUENCE promocoes_promocao_id_seq RESTART WITH 1;
ALTER SEQUENCE usuario_promocao_historico_id_seq RESTART WITH 1;
ALTER SEQUENCE staging_import_id_seq RESTART WITH 1;

-- Verificar se a tabela admin_users ainda tem dados
SELECT 'Usuários administrativos mantidos:' as info;
SELECT id, email, name, created_at FROM admin_users;

-- Mostrar contagem de registros em cada tabela
SELECT 'Contagem de registros após limpeza:' as info;
SELECT 
    'admin_users' as tabela, 
    COUNT(*) as registros 
FROM admin_users
UNION ALL
SELECT 
    'usuarios_final' as tabela, 
    COUNT(*) as registros 
FROM usuarios_final
UNION ALL
SELECT 
    'promocoes' as tabela, 
    COUNT(*) as registros 
FROM promocoes
UNION ALL
SELECT 
    'usuario_promocao' as tabela, 
    COUNT(*) as registros 
FROM usuario_promocao
UNION ALL
SELECT 
    'usuario_promocao_historico' as tabela, 
    COUNT(*) as registros 
FROM usuario_promocao_historico
UNION ALL
SELECT 
    'staging_import' as tabela, 
    COUNT(*) as registros 
FROM staging_import;