-- Script de inicialização do banco de dados BetPromo
-- Criação das tabelas principais do sistema

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários administrativos (para login na API)
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT chk_admin_users_role CHECK (role IN ('admin', 'user'))
);

-- Tabela usuarios_final (dados dos usuários do sistema)
CREATE TABLE IF NOT EXISTS usuarios_final (
    smartico_user_id BIGINT PRIMARY KEY,
    user_ext_id TEXT,
    core_sm_brand_id INT,
    crm_brand_id INT,
    ext_brand_id TEXT,
    crm_brand_name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela promocoes (definições das promoções)
CREATE TABLE IF NOT EXISTS promocoes (
    promocao_id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    regras TEXT,
    data_inicio TIMESTAMP,
    data_fim TIMESTAMP,
    status TEXT DEFAULT 'active',
    marca TEXT,
    tipo TEXT,
    notification_sms BOOLEAN DEFAULT false,
    notification_email BOOLEAN DEFAULT false,
    notification_popup BOOLEAN DEFAULT false,
    notification_push BOOLEAN DEFAULT false,
    notification_whatsapp BOOLEAN DEFAULT false,
    notification_telegram BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_status CHECK (status IN ('active', 'inactive', 'expired')),
    CONSTRAINT chk_tipo CHECK (tipo IN ('rodadas_gratis', 'bonus_deposito', 'cashback', 'freebet', 'apostas_gratis', 'outros') OR tipo IS NULL),
    CONSTRAINT unique_promocao_nome UNIQUE (nome)
);

-- Tabela usuario_promocao (vínculo atual entre usuários e promoções)
CREATE TABLE IF NOT EXISTS usuario_promocao (
    smartico_user_id BIGINT REFERENCES usuarios_final(smartico_user_id) ON DELETE CASCADE,
    promocao_id INT REFERENCES promocoes(promocao_id) ON DELETE CASCADE,
    data_vinculo TIMESTAMP DEFAULT NOW(),
    data_inicio TIMESTAMP,
    data_fim TIMESTAMP,
    regras TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (smartico_user_id, promocao_id),
    CONSTRAINT chk_usuario_promocao_status CHECK (status IN ('active', 'inactive', 'expired'))
);

-- Tabela usuario_promocao_historico (histórico completo de todas as operações)
CREATE TABLE IF NOT EXISTS usuario_promocao_historico (
    id SERIAL PRIMARY KEY,
    smartico_user_id BIGINT,
    promocao_id INT,
    filename TEXT,
    added_date TIMESTAMP DEFAULT NOW(),
    status TEXT,
    regras TEXT,
    data_inicio TIMESTAMP,
    data_fim TIMESTAMP,
    operation_type TEXT DEFAULT 'insert', -- insert, update, delete
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de staging para importação CSV
CREATE TABLE IF NOT EXISTS staging_import (
    id SERIAL PRIMARY KEY,
    smartico_user_id BIGINT NOT NULL,
    user_ext_id TEXT,
    core_sm_brand_id INT,
    crm_brand_id INT,
    ext_brand_id TEXT,
    crm_brand_name TEXT,
    promocao_nome TEXT NOT NULL,
    regras TEXT,
    data_inicio TIMESTAMP,
    data_fim TIMESTAMP,
    filename TEXT NOT NULL,
    import_date TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    operation_type TEXT DEFAULT 'insert'
);

-- Constraints de validação já definidas na criação da tabela

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_usuarios_final_user_ext_id ON usuarios_final(user_ext_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_final_crm_brand_id ON usuarios_final(crm_brand_id);
CREATE INDEX IF NOT EXISTS idx_promocoes_status ON promocoes(status);
CREATE INDEX IF NOT EXISTS idx_promocoes_data_inicio ON promocoes(data_inicio);
CREATE INDEX IF NOT EXISTS idx_promocoes_data_fim ON promocoes(data_fim);
CREATE INDEX IF NOT EXISTS idx_promocoes_marca ON promocoes(marca);
CREATE INDEX IF NOT EXISTS idx_promocoes_tipo ON promocoes(tipo);
CREATE INDEX IF NOT EXISTS idx_usuario_promocao_status ON usuario_promocao(status);
CREATE INDEX IF NOT EXISTS idx_usuario_promocao_data_inicio ON usuario_promocao(data_inicio);
CREATE INDEX IF NOT EXISTS idx_usuario_promocao_data_fim ON usuario_promocao(data_fim);
CREATE INDEX IF NOT EXISTS idx_historico_smartico_user_id ON usuario_promocao_historico(smartico_user_id);
CREATE INDEX IF NOT EXISTS idx_historico_promocao_id ON usuario_promocao_historico(promocao_id);
CREATE INDEX IF NOT EXISTS idx_historico_added_date ON usuario_promocao_historico(added_date);
CREATE INDEX IF NOT EXISTS idx_staging_filename ON staging_import(filename);
CREATE INDEX IF NOT EXISTS idx_staging_processed ON staging_import(processed);

-- Inserir usuários padrão (senha: senha123)
-- Hashes bcrypt gerados automaticamente pelo script insertTestUsers.ts

-- Usuário comum: teste@teste.com
INSERT INTO admin_users (email, password_hash, name, role) 
VALUES ('teste@teste.com', '$2b$10$H0tW.x2Gejgk/maJ7aA20OiQRHvsCliU/tOTZ6E4FWxoQuTb57GXu', 'Usuário Teste', 'user')
ON CONFLICT (email) DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Usuário administrador: admin@teste.com
INSERT INTO admin_users (email, password_hash, name, role) 
VALUES ('admin@teste.com', '$2b$10$HzPeBZgdNSElj2d.SvMhPOojAaCJ.Wn1louYS1cCQ60l5ejEgqWPC', 'Admin Teste', 'admin')
ON CONFLICT (email) DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Promoções serão criadas via API conforme necessário

-- Inserir usuário de exemplo para testes
INSERT INTO usuarios_final (smartico_user_id, user_ext_id, core_sm_brand_id, crm_brand_id, ext_brand_id, crm_brand_name) 
VALUES (65021189, '180440', 627, 627, 'a7kbetbr', 'bet7k')
ON CONFLICT (smartico_user_id) DO UPDATE SET 
    user_ext_id = EXCLUDED.user_ext_id,
    core_sm_brand_id = EXCLUDED.core_sm_brand_id,
    crm_brand_id = EXCLUDED.crm_brand_id,
    ext_brand_id = EXCLUDED.ext_brand_id,
    crm_brand_name = EXCLUDED.crm_brand_name,
    updated_at = NOW();

-- Vínculos entre usuários e promoções serão criados via API conforme necessário

-- Comentários nas tabelas
COMMENT ON TABLE usuarios_final IS 'Tabela principal de usuários do sistema';
COMMENT ON TABLE promocoes IS 'Definições das promoções disponíveis';
COMMENT ON TABLE usuario_promocao IS 'Vínculos atuais entre usuários e promoções';
COMMENT ON TABLE usuario_promocao_historico IS 'Histórico completo de todas as operações';
COMMENT ON TABLE staging_import IS 'Tabela temporária para importação de arquivos CSV';
COMMENT ON TABLE admin_users IS 'Usuários administrativos para acesso à API';

-- Comentários nos campos da tabela promocoes
COMMENT ON COLUMN promocoes.marca IS 'Marca da promoção (ex: 7k cassino, verabet)';
COMMENT ON COLUMN promocoes.tipo IS 'Tipo da promoção (ex: Apostas gratis, Rodadas Gratis, etc)';
COMMENT ON COLUMN promocoes.notification_sms IS 'Indica se a promoção foi enviada via SMS';
COMMENT ON COLUMN promocoes.notification_email IS 'Indica se a promoção foi enviada via EMAIL';
COMMENT ON COLUMN promocoes.notification_popup IS 'Indica se a promoção foi enviada via POP UP';
COMMENT ON COLUMN promocoes.notification_push IS 'Indica se a promoção foi enviada via PUSH';
COMMENT ON COLUMN promocoes.notification_whatsapp IS 'Indica se a promoção foi enviada via WhatsApp';
COMMENT ON COLUMN promocoes.notification_telegram IS 'Indica se a promoção foi enviada via Telegram';