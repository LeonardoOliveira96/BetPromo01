import { z } from 'zod';

/**
 * Schemas de validação usando Zod
 * Validação de dados de entrada da API
 */

// ============= SCHEMAS DE AUTENTICAÇÃO =============

/**
 * Schema para validação de login
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Email deve ter um formato válido')
    .min(1, 'Email é obrigatório'),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres')
});

// ============= SCHEMAS DE CONSULTA =============

/**
 * Schema para validação de parâmetros de consulta
 */
export const consultaQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 1)
    .refine((val) => val > 0, 'Página deve ser maior que 0'),
  limit: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 10)
    .refine((val) => val > 0 && val <= 100, 'Limit deve estar entre 1 e 100'),
  smartico_user_id: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .refine((val) => val === undefined || val > 0, 'smartico_user_id deve ser positivo'),
  crm_brand_id: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .refine((val) => val === undefined || val > 0, 'crm_brand_id deve ser positivo'),
  status: z
    .string()
    .optional()
    .refine((val) => !val || ['active', 'inactive', 'expired'].includes(val), 
      'Status deve ser active, inactive ou expired'),
  data_inicio: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'data_inicio deve ser uma data válida'),
  data_fim: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'data_fim deve ser uma data válida')
});

// ============= SCHEMAS DE CSV =============

/**
 * Schema para validação de linha do CSV
 */
export const csvRowSchema = z.object({
  smartico_user_id: z
    .union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val)
    .refine((val) => !isNaN(val) && val > 0, 'smartico_user_id deve ser um número positivo'),
  user_ext_id: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  core_sm_brand_id: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return undefined;
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return isNaN(num) ? undefined : num;
    }),
  crm_brand_id: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return undefined;
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return isNaN(num) ? undefined : num;
    }),
  ext_brand_id: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  crm_brand_name: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  promocao_nome: z
    .string()
    .min(1, 'Nome da promoção é obrigatório')
    .max(255, 'Nome da promoção deve ter no máximo 255 caracteres')
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  regras: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  data_inicio: z
    .union([z.string(), z.date(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (val instanceof Date) return val;
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }),
  data_fim: z
    .union([z.string(), z.date(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (val instanceof Date) return val;
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    })
});

// ============= SCHEMAS DE USUÁRIO =============

/**
 * Schema para criação de usuário final
 */
export const usuarioFinalSchema = z.object({
  smartico_user_id: z
    .number()
    .positive('smartico_user_id deve ser positivo'),
  user_ext_id: z
    .string()
    .optional(),
  core_sm_brand_id: z
    .number()
    .optional(),
  crm_brand_id: z
    .number()
    .optional(),
  ext_brand_id: z
    .string()
    .optional(),
  crm_brand_name: z
    .string()
    .optional()
});

// ============= SCHEMAS DE PROMOÇÃO =============

/**
 * Schema para criação de promoção
 */
export const promocaoSchema = z.object({
  nome: z
    .string()
    .min(1, 'Nome da promoção é obrigatório')
    .max(255, 'Nome deve ter no máximo 255 caracteres'),
  regras: z
    .string()
    .optional(),
  data_inicio: z
    .date()
    .optional(),
  data_fim: z
    .date()
    .optional(),
  status: z
    .enum(['active', 'inactive', 'expired'])
    .default('active')
});

// ============= SCHEMAS DE VÍNCULO =============

/**
 * Schema para vínculo usuário-promoção
 */
export const usuarioPromocaoSchema = z.object({
  smartico_user_id: z
    .number()
    .positive('smartico_user_id deve ser positivo'),
  promocao_id: z
    .number()
    .positive('promocao_id deve ser positivo'),
  data_inicio: z
    .date()
    .optional(),
  data_fim: z
    .date()
    .optional(),
  regras: z
    .string()
    .optional(),
  status: z
    .enum(['active', 'inactive', 'expired'])
    .default('active')
});

// ============= TIPOS DERIVADOS DOS SCHEMAS =============

export type LoginRequest = z.infer<typeof loginSchema>;
export type ConsultaQuery = z.infer<typeof consultaQuerySchema>;
export type CSVRow = z.infer<typeof csvRowSchema>;
export type UsuarioFinalInput = z.infer<typeof usuarioFinalSchema>;
export type PromocaoInput = z.infer<typeof promocaoSchema>;
export type UsuarioPromocaoInput = z.infer<typeof usuarioPromocaoSchema>;

// ============= FUNÇÕES DE VALIDAÇÃO =============

/**
 * Valida dados de login
 */
export const validateLogin = (data: unknown) => {
  return loginSchema.parse(data);
};

/**
 * Valida parâmetros de consulta
 */
export const validateConsultaQuery = (data: unknown) => {
  return consultaQuerySchema.parse(data);
};

/**
 * Valida linha do CSV
 */
export const validateCSVRow = (data: unknown) => {
  return csvRowSchema.parse(data);
};

/**
 * Valida dados de usuário final
 */
export const validateUsuarioFinal = (data: unknown) => {
  return usuarioFinalSchema.parse(data);
};

/**
 * Valida dados de promoção
 */
export const validatePromocao = (data: unknown) => {
  return promocaoSchema.parse(data);
};

/**
 * Valida dados de vínculo usuário-promoção
 */
export const validateUsuarioPromocao = (data: unknown) => {
  return usuarioPromocaoSchema.parse(data);
};