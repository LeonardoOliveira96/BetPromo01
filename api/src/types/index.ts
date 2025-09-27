/**
 * Interfaces e DTOs para o sistema BetPromo
 * Tipagem forte para todas as entidades do banco de dados
 */

// ============= ENTIDADES DO BANCO DE DADOS =============

/**
 * Interface para usuário administrativo
 */
export interface AdminUser {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

/**
 * Interface para usuário final do sistema
 */
export interface UsuarioFinal {
  smartico_user_id: number;
  user_ext_id?: string;
  core_sm_brand_id?: number;
  crm_brand_id?: number;
  ext_brand_id?: string;
  crm_brand_name?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface para promoção
 */
export interface Promocao {
  promocao_id: number;
  nome: string;
  regras?: string;
  data_inicio?: Date;
  data_fim?: Date;
  status: 'active' | 'inactive' | 'expired';
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface para vínculo usuário-promoção
 */
export interface UsuarioPromocao {
  smartico_user_id: number;
  promocao_id: number;
  data_vinculo: Date;
  data_inicio?: Date;
  data_fim?: Date;
  regras?: string;
  status: 'active' | 'inactive' | 'expired';
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface para histórico de usuário-promoção
 */
export interface UsuarioPromocaoHistorico {
  id: number;
  smartico_user_id?: number;
  promocao_id?: number;
  filename?: string;
  added_date: Date;
  status?: string;
  regras?: string;
  data_inicio?: Date;
  data_fim?: Date;
  operation_type: 'insert' | 'update' | 'delete';
  created_at: Date;
}

/**
 * Interface para staging de importação
 */
export interface StagingImport {
  id: number;
  smartico_user_id?: number;
  user_ext_id?: string;
  core_sm_brand_id?: number;
  crm_brand_id?: number;
  ext_brand_id?: string;
  crm_brand_name?: string;
  promocao_nome?: string;
  regras?: string;
  data_inicio?: Date;
  data_fim?: Date;
  filename?: string;
  import_date: Date;
  processed: boolean;
}

// ============= DTOs DE REQUISIÇÃO =============

/**
 * DTO para login
 */
export interface LoginRequestDTO {
  email: string;
  password: string;
}

/**
 * DTO para upload de CSV
 */
export interface CSVUploadRequestDTO {
  file: Express.Multer.File;
}

/**
 * DTO para consulta de usuários
 */
export interface ConsultaRequestDTO {
  page?: number;
  limit?: number;
  smartico_user_id?: number;
  crm_brand_id?: number;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}

// ============= DTOs DE RESPOSTA =============

/**
 * DTO de resposta para login
 */
export interface LoginResponseDTO {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  message?: string;
}

/**
 * DTO de resposta para consulta de usuários
 */
export interface ConsultaResponseDTO {
  success: boolean;
  data?: UsuarioComPromocoes[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

/**
 * DTO de resposta para inserção de dados
 */
export interface InsercaoResponseDTO {
  success: boolean;
  data?: {
    filename: string;
    totalRows: number;
    processedRows: number;
    newUsers: number;
    newPromotions: number;
    newUserPromotions: number;
    errors: string[];
  };
  message?: string;
}

/**
 * Interface para usuário com suas promoções
 */
export interface UsuarioComPromocoes extends UsuarioFinal {
  promocoes: Array<{
    promocao_id: number;
    nome: string;
    regras?: string;
    data_inicio?: Date;
    data_fim?: Date;
    status: string;
    data_vinculo: Date;
  }>;
}

/**
 * Interface para dados do CSV
 */
export interface CSVRowData {
  smartico_user_id: number;
  user_ext_id?: string;
  core_sm_brand_id?: number;
  crm_brand_id?: number;
  ext_brand_id?: string;
  crm_brand_name?: string;
  promocao_nome: string;
  regras?: string;
  data_inicio?: Date;
  data_fim?: Date;
}

// ============= TIPOS UTILITÁRIOS =============

/**
 * Tipo para resposta padrão da API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Tipo para paginação
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Tipo para filtros de consulta
 */
export interface ConsultaFilters {
  smartico_user_id?: number;
  crm_brand_id?: number;
  status?: string;
  data_inicio?: Date;
  data_fim?: Date;
}

/**
 * Tipo para payload do JWT
 */
export interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Tipo para estatísticas de importação
 */
export interface ImportStats {
  totalRows: number;
  processedRows: number;
  newUsers: number;
  newPromotions: number;
  newUserPromotions: number;
  errors: string[];
}