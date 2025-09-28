import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { csvControllerOptimized } from '../controllers/csvControllerOptimized';

const router = Router();

// Configuração otimizada do Multer para upload de arquivos
const uploadDir = process.env.UPLOAD_PATH || './uploads';

// Garante que o diretório de upload existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do storage otimizada
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Nome único com timestamp para evitar conflitos
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    
    // Sanitiza o nome do arquivo
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${sanitizedBaseName}_${timestamp}_${randomSuffix}${extension}`;
    
    cb(null, uniqueName);
  }
});

// Filtro de arquivos otimizado
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceita apenas arquivos CSV
  if (file.mimetype === 'text/csv' || 
      file.mimetype === 'application/csv' || 
      file.originalname.toLowerCase().endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos CSV são permitidos'));
  }
};

// Configuração do Multer otimizada
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB padrão
    files: 1 // Apenas um arquivo por vez
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ImportacaoOtimizadaResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indica se a operação foi bem-sucedida
 *         data:
 *           type: object
 *           properties:
 *             filename:
 *               type: string
 *               description: Nome do arquivo processado
 *             totalRows:
 *               type: integer
 *               description: Total de linhas no arquivo
 *             processedRows:
 *               type: integer
 *               description: Número de linhas processadas com sucesso
 *             newUsers:
 *               type: integer
 *               description: Número de novos usuários criados
 *             newPromotions:
 *               type: integer
 *               description: Número de novas promoções criadas
 *             newUserPromotions:
 *               type: integer
 *               description: Número de novos vínculos usuário-promoção
 *             errors:
 *               type: array
 *               items:
 *                 type: string
 *               description: Lista de erros encontrados durante o processamento
 *         message:
 *           type: string
 *           description: Mensagem descritiva do resultado
 * 
 *     StatusDiscoResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             disk:
 *               type: object
 *               description: Informações do disco
 *             files:
 *               type: object
 *               properties:
 *                 totalFiles:
 *                   type: integer
 *                 totalSizeMB:
 *                   type: string
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       sizeMB:
 *                         type: string
 *                       created:
 *                         type: string
 *                         format: date-time
 *                       modified:
 *                         type: string
 *                         format: date-time
 *                       ageHours:
 *                         type: string
 *             timestamp:
 *               type: string
 *               format: date-time
 * 
 *     LimpezaResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             removedFiles:
 *               type: integer
 *             freedSpaceMB:
 *               type: string
 *             timestamp:
 *               type: string
 *               format: date-time
 */

/**
 * @swagger
 * /api/csv-otimizado/insercao:
 *   post:
 *     summary: Importação otimizada de arquivo CSV
 *     description: |
 *       Endpoint otimizado para importação de grandes arquivos CSV com:
 *       - Processamento em streaming para economizar memória
 *       - Limpeza automática de arquivos após processamento
 *       - Processamento em batches para melhor performance
 *       - Otimizações de banco de dados
 *     tags: [CSV Otimizado]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: Arquivo CSV para importação (máximo 100MB)
 *     responses:
 *       200:
 *         description: Importação realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportacaoOtimizadaResponse'
 *       400:
 *         description: Erro de validação (arquivo inválido, muito grande, etc.)
 *       500:
 *         description: Erro interno do servidor
 *     examples:
 *       success:
 *         summary: Importação bem-sucedida
 *         value:
 *           success: true
 *           data:
 *             filename: "usuarios_20240101_123456.csv"
 *             totalRows: 1000000
 *             processedRows: 999950
 *             newUsers: 50000
 *             newPromotions: 25
 *             newUserPromotions: 150000
 *             errors: []
 *           message: "Importação otimizada concluída: 999950/1000000 registros processados"
 */
router.post('/insercao', 
  upload.single('file'), 
  csvControllerOptimized.importarCSVOtimizado.bind(csvControllerOptimized)
);

/**
 * @swagger
 * /api/csv-otimizado/limpeza-arquivos:
 *   post:
 *     summary: Limpeza manual de arquivos antigos
 *     description: Remove arquivos de upload com idade superior ao especificado
 *     tags: [CSV Otimizado]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxAgeHours:
 *                 type: integer
 *                 default: 1
 *                 description: Idade máxima dos arquivos em horas
 *     responses:
 *       200:
 *         description: Limpeza realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/limpeza-arquivos', 
  csvControllerOptimized.limparArquivos.bind(csvControllerOptimized)
);

/**
 * @swagger
 * /api/csv-otimizado/limpeza-forcada:
 *   post:
 *     summary: Limpeza forçada de todos os arquivos
 *     description: Remove TODOS os arquivos do diretório de upload imediatamente
 *     tags: [CSV Otimizado]
 *     responses:
 *       200:
 *         description: Limpeza forçada realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LimpezaResponse'
 */
router.post('/limpeza-forcada', 
  csvControllerOptimized.limpezaForcada.bind(csvControllerOptimized)
);

/**
 * @swagger
 * /api/csv-otimizado/status-disco:
 *   get:
 *     summary: Verifica status do disco e arquivos
 *     description: Retorna informações sobre uso de disco e arquivos no diretório de upload
 *     tags: [CSV Otimizado]
 *     responses:
 *       200:
 *         description: Status obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusDiscoResponse'
 */
router.get('/status-disco', 
  csvControllerOptimized.verificarStatusDisco.bind(csvControllerOptimized)
);

/**
 * @swagger
 * /api/csv-otimizado/configurar-limpeza:
 *   post:
 *     summary: Configura limpeza automática
 *     description: Define intervalo e critérios para limpeza automática de arquivos
 *     tags: [CSV Otimizado]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               intervalMinutes:
 *                 type: integer
 *                 default: 30
 *                 description: Intervalo entre limpezas em minutos
 *               maxAgeHours:
 *                 type: integer
 *                 default: 1
 *                 description: Idade máxima dos arquivos em horas
 *     responses:
 *       200:
 *         description: Limpeza automática configurada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 config:
 *                   type: object
 *                   properties:
 *                     intervalMinutes:
 *                       type: integer
 *                     maxAgeHours:
 *                       type: integer
 *                     nextCleanup:
 *                       type: string
 *                       format: date-time
 */
router.post('/configurar-limpeza', 
  csvControllerOptimized.configurarLimpezaAutomatica.bind(csvControllerOptimized)
);

/**
 * @swagger
 * /api/csv-otimizado/health:
 *   get:
 *     summary: Health check do serviço otimizado
 *     description: Verifica se o serviço de importação otimizada está funcionando
 *     tags: [CSV Otimizado]
 *     responses:
 *       200:
 *         description: Serviço funcionando corretamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 service:
 *                   type: string
 *                 version:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uploadDir:
 *                   type: string
 *                 maxFileSize:
 *                   type: string
 */
router.get('/health', (req, res) => {
  try {
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '104857600');
    const maxFileSizeMB = (maxFileSize / 1024 / 1024).toFixed(0);
    
    res.status(200).json({
      success: true,
      message: 'Serviço de importação CSV otimizada funcionando corretamente',
      service: 'CSV Import Optimized',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uploadDir: uploadDir,
      maxFileSize: `${maxFileSizeMB}MB`,
      features: [
        'Streaming processing',
        'Automatic file cleanup',
        'Batch processing',
        'Database optimizations',
        'Disk monitoring',
        'Memory optimization'
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro no health check do serviço otimizado',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Middleware de tratamento de erros específico para upload
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Arquivo muito grande',
        code: 'FILE_TOO_LARGE',
        maxSize: process.env.MAX_FILE_SIZE || '104857600'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Muitos arquivos enviados',
        code: 'TOO_MANY_FILES'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Campo de arquivo inesperado',
        code: 'UNEXPECTED_FILE'
      });
    }
  }
  
  if (error.message === 'Apenas arquivos CSV são permitidos') {
    return res.status(400).json({
      success: false,
      message: 'Apenas arquivos CSV são permitidos',
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  // Erro genérico
  console.error('Erro no middleware de upload otimizado:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno no processamento do arquivo',
    code: 'UPLOAD_ERROR'
  });
});

export default router;