import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuração do pool de conexões PostgreSQL
 * Utiliza variáveis de ambiente para configuração
 */
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'betpromo',
  user: process.env.DB_USER || 'betpromo_user',
  password: process.env.DB_PASSWORD || 'betpromo_pass',
  max: 20, // Máximo de conexões no pool
  idleTimeoutMillis: 30000, // Tempo limite para conexões ociosas
  connectionTimeoutMillis: 10000, // Tempo limite para estabelecer conexão (aumentado para 10s)
  query_timeout: 30000, // Timeout para queries (30s)
  statement_timeout: 30000, // Timeout para statements (30s)
};

/**
 * Pool de conexões global
 */
export const pool = new Pool(poolConfig);

/**
 * Evento de erro no pool de conexões
 */
pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões:', err);
  process.exit(-1);
});

/**
 * Função para testar a conexão com o banco
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexão com PostgreSQL estabelecida:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com PostgreSQL:', error);
    return false;
  }
};

/**
 * Função para executar queries com tratamento de erro
 */
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executada:', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Erro na query:', { text, error });
    throw error;
  }
};

/**
 * Função para executar transações
 */
export const transaction = async (callback: (client: any) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Função para fechar o pool de conexões
 */
export const closePool = async (): Promise<void> => {
  await pool.end();
  console.log('Pool de conexões fechado');
};

// Testa a conexão na inicialização
testConnection();