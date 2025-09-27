import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

/**
 * Utilitários de autenticação
 * Funções para hash de senha, geração e verificação de JWT
 */

const JWT_SECRET: string = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 10;

/**
 * Gera hash da senha usando bcrypt
 * @param password - Senha em texto plano
 * @returns Hash da senha
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Erro ao gerar hash da senha:', error);
    throw new Error('Erro interno do servidor');
  }
};

/**
 * Verifica se a senha corresponde ao hash
 * @param password - Senha em texto plano
 * @param hash - Hash armazenado no banco
 * @returns True se a senha estiver correta
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return false;
  }
};

/**
 * Gera token JWT
 * @param payload - Dados do usuário para incluir no token
 * @returns Token JWT
 */
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET não configurado');
    }
    
    const signOptions: jwt.SignOptions = {
      expiresIn: JWT_EXPIRES_IN as any,
      issuer: 'betpromo-api',
      audience: 'betpromo-client'
    };
    
    const token = jwt.sign(payload, JWT_SECRET, signOptions);
    return token;
  } catch (error) {
    console.error('Erro ao gerar token JWT:', error);
    throw new Error('Erro interno do servidor');
  }
};

/**
 * Verifica e decodifica token JWT
 * @param token - Token JWT
 * @returns Payload decodificado ou null se inválido
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET não configurado');
    }
    
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'betpromo-api',
      audience: 'betpromo-client'
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Token expirado');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Token inválido');
    } else {
      console.error('Erro ao verificar token:', error);
    }
    return null;
  }
};

/**
 * Extrai token do header Authorization
 * @param authHeader - Header Authorization (Bearer token)
 * @returns Token ou null se não encontrado
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] ?? null;
};

/**
 * Valida formato do email
 * @param email - Email para validar
 * @returns True se o email for válido
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida força da senha
 * @param password - Senha para validar
 * @returns Objeto com resultado da validação
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Senha deve ter pelo menos 6 caracteres');
  }

  if (password.length > 100) {
    errors.push('Senha deve ter no máximo 100 caracteres');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }

  if (!/\d/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Gera senha aleatória segura
 * @param length - Comprimento da senha (padrão: 12)
 * @returns Senha aleatória
 */
export const generateRandomPassword = (length: number = 12): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};