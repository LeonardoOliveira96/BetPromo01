-- =====================================================
-- SCRIPT DE OTIMIZAÇÃO DO BANCO DE DADOS POSTGRESQL
-- Para melhorar performance de importação CSV e consultas
-- =====================================================

-- Configurações de sessão para otimização
SET maintenance_work_mem = '1GB';
SET max_parallel_workers_per_gather = 4;
SET max_parallel_maintenance_workers = 4;

-- =====================================================
-- ÍNDICES PARA TABELA usuarios_final
-- =====================================================

-- Índice principal para smartico_user_id (chave primária já existe)
-- Índice para consultas por user_ext_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_final_user_ext_id 
ON usuarios_final (user_ext_id) 
WHERE user_ext_id IS NOT NULL;

-- Índice para consultas por brand_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_final_core_sm_brand_id 
ON usuarios_final (core_sm_brand_id) 
WHERE core_sm_brand_id IS NOT NULL;

-- Índice para consultas por crm_brand_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_final_crm_brand_id 
ON usuarios_final (crm_brand_id) 
WHERE crm_brand_id IS NOT NULL;

-- Índice composto para consultas complexas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_final_brand_composite 
ON usuarios_final (core_sm_brand_id, crm_brand_id) 
WHERE core_sm_brand_id IS NOT NULL AND crm_brand_id IS NOT NULL;

-- Índice para ordenação por data de criação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_final_created_at 
ON usuarios_final (created_at DESC);

-- =====================================================
-- ÍNDICES PARA TABELA staging_import
-- =====================================================

-- Índice para filename (usado na limpeza e processamento)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_import_filename 
ON staging_import (filename);

-- Índice para processed (usado para filtrar dados não processados)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_import_processed 
ON staging_import (processed) 
WHERE processed = false;

-- Índice composto para otimizar merge de usuários
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_import_user_merge 
ON staging_import (smartico_user_id, filename, processed);

-- Índice para promoções na staging
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_import_promocao 
ON staging_import (promocao_nome) 
WHERE promocao_nome IS NOT NULL;

-- Índice para datas de importação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_import_created_at 
ON staging_import (created_at DESC);

-- =====================================================
-- ÍNDICES PARA TABELA promocoes
-- =====================================================

-- Índice único para nome da promoção (já existe como constraint)
-- Índice para status das promoções
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promocoes_status 
ON promocoes (status);

-- Índice para data de início
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promocoes_data_inicio 
ON promocoes (data_inicio) 
WHERE data_inicio IS NOT NULL;

-- Índice para data de fim
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promocoes_data_fim 
ON promocoes (data_fim) 
WHERE data_fim IS NOT NULL;

-- Índice composto para consultas por período
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promocoes_periodo 
ON promocoes (data_inicio, data_fim, status) 
WHERE data_inicio IS NOT NULL AND data_fim IS NOT NULL;

-- Índice para ordenação por data de criação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promocoes_created_at 
ON promocoes (created_at DESC);

-- =====================================================
-- ÍNDICES PARA TABELA usuario_promocao
-- =====================================================

-- Índice composto para chave primária (smartico_user_id, promocao_id)
-- já existe como constraint

-- Índice para consultas por usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuario_promocao_user_id 
ON usuario_promocao (smartico_user_id);

-- Índice para consultas por promoção
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuario_promocao_promocao_id 
ON usuario_promocao (promocao_id);

-- Índice para status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuario_promocao_status 
ON usuario_promocao (status);

-- Índice para data de início
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuario_promocao_data_inicio 
ON usuario_promocao (data_inicio) 
WHERE data_inicio IS NOT NULL;

-- Índice para data de fim
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuario_promocao_data_fim 
ON usuario_promocao (data_fim) 
WHERE data_fim IS NOT NULL;

-- Índice composto para consultas ativas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuario_promocao_ativo 
ON usuario_promocao (smartico_user_id, status, data_inicio, data_fim) 
WHERE status = 'active';

-- Índice para ordenação por data de criação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuario_promocao_created_at 
ON usuario_promocao (created_at DESC);

-- =====================================================
-- ÍNDICES PARA TABELA usuario_promocao_historico
-- =====================================================

-- Índice para consultas por usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_historico_user_id 
ON usuario_promocao_historico (smartico_user_id);

-- Índice para consultas por promoção
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_historico_promocao_id 
ON usuario_promocao_historico (promocao_id);

-- Índice para filename (usado para rastreamento de importações)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_historico_filename 
ON usuario_promocao_historico (filename);

-- Índice para operation_type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_historico_operation_type 
ON usuario_promocao_historico (operation_type);

-- Índice composto para consultas de auditoria
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_historico_auditoria 
ON usuario_promocao_historico (smartico_user_id, promocao_id, operation_type, created_at);

-- Índice para ordenação por data de criação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_historico_created_at 
ON usuario_promocao_historico (created_at DESC);

-- =====================================================
-- ÍNDICES PARA TABELA admin_users
-- =====================================================

-- Índice único para email (já existe como constraint)
-- Índice para status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_users_status 
ON admin_users (status);

-- Índice para role
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_users_role 
ON admin_users (role);

-- Índice para last_login
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_users_last_login 
ON admin_users (last_login DESC NULLS LAST);

-- =====================================================
-- OTIMIZAÇÕES DE CONFIGURAÇÃO DO POSTGRESQL
-- =====================================================

-- Configurações para melhor performance em operações de bulk insert
-- NOTA: Estas configurações devem ser aplicadas no postgresql.conf
-- ou via ALTER SYSTEM para serem permanentes

-- Comentários com configurações recomendadas:
/*
-- Memória para operações de manutenção (índices, VACUUM, etc.)
ALTER SYSTEM SET maintenance_work_mem = '1GB';

-- Memória para operações de trabalho (sorts, hash joins, etc.)
ALTER SYSTEM SET work_mem = '256MB';

-- Buffer compartilhado (25% da RAM disponível)
ALTER SYSTEM SET shared_buffers = '2GB';

-- Cache efetivo (75% da RAM disponível)
ALTER SYSTEM SET effective_cache_size = '6GB';

-- Configurações para checkpoint
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '64MB';

-- Configurações para parallel queries
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET max_parallel_maintenance_workers = 4;
ALTER SYSTEM SET max_parallel_workers = 8;

-- Configurações para autovacuum
ALTER SYSTEM SET autovacuum_max_workers = 6;
ALTER SYSTEM SET autovacuum_naptime = '30s';

-- Aplicar configurações
SELECT pg_reload_conf();
*/

-- =====================================================
-- ESTATÍSTICAS E ANÁLISE
-- =====================================================

-- Atualiza estatísticas para o otimizador de consultas
ANALYZE usuarios_final;
ANALYZE staging_import;
ANALYZE promocoes;
ANALYZE usuario_promocao;
ANALYZE usuario_promocao_historico;
ANALYZE admin_users;

-- =====================================================
-- VACUUM PARA LIMPEZA E OTIMIZAÇÃO
-- =====================================================

-- VACUUM completo para otimizar espaço
VACUUM (ANALYZE, VERBOSE) usuarios_final;
VACUUM (ANALYZE, VERBOSE) staging_import;
VACUUM (ANALYZE, VERBOSE) promocoes;
VACUUM (ANALYZE, VERBOSE) usuario_promocao;
VACUUM (ANALYZE, VERBOSE) usuario_promocao_historico;
VACUUM (ANALYZE, VERBOSE) admin_users;

-- =====================================================
-- VIEWS OTIMIZADAS PARA CONSULTAS FREQUENTES
-- =====================================================

-- View para usuários ativos com promoções
CREATE OR REPLACE VIEW v_usuarios_promocoes_ativas AS
SELECT 
    u.smartico_user_id,
    u.user_ext_id,
    u.crm_brand_name,
    p.nome as promocao_nome,
    up.data_inicio,
    up.data_fim,
    up.status,
    up.created_at as vinculo_criado
FROM usuarios_final u
JOIN usuario_promocao up ON u.smartico_user_id = up.smartico_user_id
JOIN promocoes p ON up.promocao_id = p.promocao_id
WHERE up.status = 'active'
    AND (up.data_fim IS NULL OR up.data_fim > NOW());

-- View para estatísticas de importação
CREATE OR REPLACE VIEW v_estatisticas_importacao AS
SELECT 
    DATE(created_at) as data_importacao,
    COUNT(*) as total_registros,
    COUNT(DISTINCT smartico_user_id) as usuarios_unicos,
    COUNT(DISTINCT promocao_nome) as promocoes_unicas
FROM staging_import
GROUP BY DATE(created_at)
ORDER BY data_importacao DESC;

-- View para monitoramento de performance
CREATE OR REPLACE VIEW v_performance_tabelas AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE schemaname = 'public'
    AND tablename IN ('usuarios_final', 'staging_import', 'promocoes', 'usuario_promocao', 'usuario_promocao_historico')
ORDER BY tablename, attname;

-- =====================================================
-- FUNÇÕES UTILITÁRIAS PARA MONITORAMENTO
-- =====================================================

-- Função para verificar tamanho das tabelas
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
    table_name text,
    size_pretty text,
    size_bytes bigint,
    row_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::text,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)::regclass))::text,
        pg_total_relation_size(quote_ident(t.table_name)::regclass),
        (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name)
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name IN ('usuarios_final', 'staging_import', 'promocoes', 'usuario_promocao', 'usuario_promocao_historico', 'admin_users')
    ORDER BY pg_total_relation_size(quote_ident(t.table_name)::regclass) DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar índices não utilizados
CREATE OR REPLACE FUNCTION get_unused_indexes()
RETURNS TABLE(
    schemaname text,
    tablename text,
    indexname text,
    size_pretty text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname::text,
        s.tablename::text,
        s.indexname::text,
        pg_size_pretty(pg_relation_size(s.indexname::regclass))::text
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE s.idx_scan = 0
        AND NOT i.indisunique
        AND NOT i.indisprimary
        AND s.schemaname = 'public'
    ORDER BY pg_relation_size(s.indexname::regclass) DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MENSAGENS DE CONCLUSÃO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Script de otimização executado com sucesso!';
    RAISE NOTICE '📊 Índices criados para melhorar performance de consultas';
    RAISE NOTICE '🧹 VACUUM executado para otimizar espaço em disco';
    RAISE NOTICE '📈 Estatísticas atualizadas para o otimizador de consultas';
    RAISE NOTICE '👁️ Views criadas para consultas frequentes';
    RAISE NOTICE '🔧 Funções utilitárias criadas para monitoramento';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Para aplicar configurações de performance permanentes:';
    RAISE NOTICE '   1. Edite postgresql.conf com as configurações comentadas';
    RAISE NOTICE '   2. Reinicie o PostgreSQL';
    RAISE NOTICE '   3. Execute: SELECT pg_reload_conf();';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Para monitorar performance:';
    RAISE NOTICE '   - SELECT * FROM get_table_sizes();';
    RAISE NOTICE '   - SELECT * FROM get_unused_indexes();';
    RAISE NOTICE '   - SELECT * FROM v_performance_tabelas;';
END $$;