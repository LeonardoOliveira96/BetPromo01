import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/auth';
import { JWTPayload } from '../types';

/**
 * Interface estendida do Request para incluir dados do usuário
 */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido e adiciona os dados do usuário à requisição
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extrai o token do header Authorization
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token de acesso não fornecido',
        error: 'MISSING_TOKEN'
      });
      return;
    }

    // Verifica e decodifica o token
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado',
        error: 'INVALID_TOKEN'
      });
      return;
    }

    // Adiciona os dados do usuário à requisição
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware opcional de autenticação
 * Adiciona dados do usuário se o token for válido, mas não bloqueia a requisição
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação opcional:', error);
    next(); // Continua mesmo com erro
  }
};

/**
 * Middleware para verificar se o usuário é administrador
 * Deve ser usado após o middleware de autenticação
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Usuário não autenticado',
      error: 'NOT_AUTHENTICATED'
    });
    return;
  }

  // Aqui você pode adicionar lógica adicional para verificar se o usuário é admin
  // Por exemplo, verificar uma propriedade 'role' no payload do JWT
  // if (req.user.role !== 'admin') {
  //   res.status(403).json({
  //     success: false,
  //     message: 'Acesso negado. Privilégios de administrador necessários.',
  //     error: 'INSUFFICIENT_PRIVILEGES'
  //   });
  //   return;
  // }

  next();
};

/**
 * Middleware para rate limiting básico
 * Limita o número de requisições por IP
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
const MAX_REQUESTS = 100; // Máximo de requisições por janela

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  // Obtém ou cria o contador para este IP
  let requestData = requestCounts.get(clientIP);

  if (!requestData || now > requestData.resetTime) {
    // Primeira requisição ou janela expirou
    requestData = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    };
  } else {
    // Incrementa o contador
    requestData.count++;
  }

  requestCounts.set(clientIP, requestData);

  // Verifica se excedeu o limite
  if (requestData.count > MAX_REQUESTS) {
    res.status(429).json({
      success: false,
      message: 'Muitas requisições. Tente novamente em alguns minutos.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
    });
    return;
  }

  // Adiciona headers informativos
  res.set({
    'X-RateLimit-Limit': MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': (MAX_REQUESTS - requestData.count).toString(),
    'X-RateLimit-Reset': new Date(requestData.resetTime).toISOString()
  });

  next();
};

/**
 * Middleware para limpar contadores de rate limiting expirados
 * Deve ser executado periodicamente
 */
export const cleanupRateLimitCounters = (): void => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }
};

// Executa limpeza a cada 30 minutos
setInterval(cleanupRateLimitCounters, 30 * 60 * 1000);