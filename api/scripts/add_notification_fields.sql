-- Migração para adicionar campos de notificação à tabela promocoes
-- Adiciona campos para marca, tipo e notificações

-- Adicionar campos de marca e tipo
ALTER TABLE promocoes 
ADD COLUMN IF NOT EXISTS marca VARCHAR(255),
ADD COLUMN IF NOT EXISTS tipo VARCHAR(255);

-- Adicionar campos de notificação
ALTER TABLE promocoes 
ADD COLUMN IF NOT EXISTS notification_sms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_popup BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_push BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_telegram BOOLEAN DEFAULT false;

-- Comentários nos novos campos
COMMENT ON COLUMN promocoes.marca IS 'Marca da promoção (ex: 3 7k cassino, verabet)';
COMMENT ON COLUMN promocoes.tipo IS 'Tipo da promoção (ex: Apostas gratis, Rodadas Gratis, etc)';
COMMENT ON COLUMN promocoes.notification_sms IS 'Indica se a promoção foi enviada via SMS';
COMMENT ON COLUMN promocoes.notification_email IS 'Indica se a promoção foi enviada via EMAIL';
COMMENT ON COLUMN promocoes.notification_popup IS 'Indica se a promoção foi enviada via POP UP';
COMMENT ON COLUMN promocoes.notification_push IS 'Indica se a promoção foi enviada via PUSH';
COMMENT ON COLUMN promocoes.notification_whatsapp IS 'Indica se a promoção foi enviada via WhatsApp';
COMMENT ON COLUMN promocoes.notification_telegram IS 'Indica se a promoção foi enviada via Telegram';