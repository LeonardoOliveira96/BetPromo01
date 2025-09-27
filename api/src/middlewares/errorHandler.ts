import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Interface para erros customizados
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: string;

  constructor(message: string, statusCode: number = 500, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de tratamento de erros global
 * Captura todos os erros da aplicação e retorna respostas padronizadas
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Erro interno do servidor';
  let errorCode = 'INTERNAL_ERROR';
  let details: any = undefined;

  // Log do erro para debugging
  console.error('Erro capturado pelo middleware:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Tratamento de diferentes tipos de erro
  if (error instanceof AppError) {
    // Erro customizado da aplicação
    statusCode = error.statusCode;
    message = error.message;
    errorCode = error.errorCode || 'APP_ERROR';
  } else if (error instanceof ZodError) {
    // Erro de validação do Zod
    statusCode = 400;
    message = 'Dados de entrada inválidos';
    errorCode = 'VALIDATION_ERROR';
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
  } else if (error.name === 'JsonWebTokenError') {
    // Erro de JWT
    statusCode = 401;
    message = 'Token inválido';
    errorCode = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    // Token expirado
    statusCode = 401;
    message = 'Token expirado';
    errorCode = 'EXPIRED_TOKEN';
  } else if (error.name === 'MulterError') {
    // Erro de upload de arquivo
    statusCode = 400;
    errorCode = 'FILE_UPLOAD_ERROR';
    
    switch ((error as any).code) {
      case 'LIMIT_FILE_SIZE':
        message = 'Arquivo muito grande';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Muitos arquivos enviados';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Campo de arquivo inesperado';
        break;
      default:
        message = 'Erro no upload do arquivo';
    }
  } else if ((error as any).code === '23505') {
    // Erro de violação de constraint única (PostgreSQL)
    statusCode = 409;
    message = 'Dados já existem no sistema';
    errorCode = 'DUPLICATE_ENTRY';
  } else if ((error as any).code === '23503') {
    // Erro de violação de foreign key (PostgreSQL)
    statusCode = 400;
    message = 'Referência inválida nos dados';
    errorCode = 'FOREIGN_KEY_VIOLATION';
  } else if ((error as any).code === '23502') {
    // Erro de campo obrigatório nulo (PostgreSQL)
    statusCode = 400;
    message = 'Campo obrigatório não fornecido';
    errorCode = 'NULL_CONSTRAINT_VIOLATION';
  } else if ((error as any).code === 'ECONNREFUSED') {
    // Erro de conexão com banco de dados
    statusCode = 503;
    message = 'Serviço temporariamente indisponível';
    errorCode = 'DATABASE_CONNECTION_ERROR';
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    // Erro de parsing JSON
    statusCode = 400;
    message = 'Formato JSON inválido';
    errorCode = 'INVALID_JSON';
  }

  // Resposta de erro padronizada
  const errorResponse: any = {
    success: false,
    message,
    error: errorCode,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  };

  // Adiciona detalhes apenas em desenvolvimento ou para erros de validação
  if (details && (process.env.NODE_ENV === 'development' || errorCode === 'VALIDATION_ERROR')) {
    errorResponse.details = details;
  }

  // Adiciona stack trace apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para capturar rotas não encontradas
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(
    `Rota ${req.method} ${req.url} não encontrada`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Middleware para validação de dados usando Zod
 */
export const validateRequest = (schema: any, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[property];
      const validatedData = schema.parse(dataToValidate);
      req[property] = validatedData;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware para capturar erros assíncronos
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware para logging de requisições
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    if (res.statusCode >= 400) {
      console.error('Requisição com erro:', logData);
    } else {
      console.log('Requisição processada:', logData);
    }
  });

  next();
};

/**
 * Middleware para sanitização de dados de entrada
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Remove propriedades potencialmente perigosas
  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Remove propriedades que começam com $ ou contêm __proto__
      if (!key.startsWith('$') && key !== '__proto__' && key !== 'constructor') {
        if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitize(value);
        } else if (typeof value === 'string') {
          // Remove caracteres potencialmente perigosos
          sanitized[key] = value.replace(/[<>]/g, '');
        } else {
          sanitized[key] = value;
        }
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};