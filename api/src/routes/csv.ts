import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { CSVController } from '../controllers/csvController';
import { authenticateToken } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

/**
 * Rotas de importação CSV
 * Define endpoints para upload e processamento de arquivos CSV
 */
const router = Router();
const csvController = new CSVController();

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Gera nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `import-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Aceita apenas arquivos CSV
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos CSV são permitidos'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    files: 1
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     InsercaoResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
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
 *               description: Linhas processadas com sucesso
 *             newUsers:
 *               type: integer
 *               description: Novos usuários criados
 *             newPromotions:
 *               type: integer
 *               description: Novas promoções criadas
 *             newUserPromotions:
 *               type: integer
 *               description: Novos vínculos usuário-promoção
 *             errors:
 *               type: array
 *               items:
 *                 type: string
 *               description: Lista de erros encontrados
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /insercao:
 *   post:
 *     summary: Upload e processamento de arquivo CSV
 *     description: |
 *       Recebe upload de arquivo CSV e processa os dados:
 *       - Importa dados para staging_import usando COPY
 *       - Merge na tabela usuarios_final (ON CONFLICT DO NOTHING)
 *       - Cria promoções novas na tabela promocoes
 *       - Vincula usuários às promoções na tabela usuario_promocao
 *       - Registra histórico em usuario_promocao_historico
 *       
 *       **Formato do CSV:**
 *       - smartico_user_id: ID único do usuário (obrigatório)
 *       - user_ext_id: ID externo do usuário
 *       - core_sm_brand_id: ID da marca no core
 *       - crm_brand_id: ID da marca no CRM
 *       - ext_brand_id: ID externo da marca
 *       - crm_brand_name: Nome da marca no CRM
 *       - promocao_nome: Nome da promoção (obrigatório)
 *       - regras: Regras da promoção
 *       - data_inicio: Data de início (YYYY-MM-DD HH:MM:SS)
 *       - data_fim: Data de fim (YYYY-MM-DD HH:MM:SS)
 *     tags: [Importação]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo CSV para importação
 *     responses:
 *       200:
 *         description: Arquivo processado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InsercaoResponse'
 *       400:
 *         description: Arquivo inválido ou dados incorretos
 *       401:
 *         description: Token inválido
 *       413:
 *         description: Arquivo muito grande
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/',
  authenticateToken,
  upload.single('file'),
  asyncHandler(csvController.insercao)
);

/**
 * @swagger
 * /insercao/validate:
 *   post:
 *     summary: Validação de arquivo CSV
 *     description: Valida arquivo CSV sem processar os dados (dry-run)
 *     tags: [Importação]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo CSV para validação
 *     responses:
 *       200:
 *         description: Arquivo válido
 *       400:
 *         description: Arquivo inválido
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/validate',
  authenticateToken,
  upload.single('file'),
  asyncHandler(csvController.validate)
);

/**
 * @swagger
 * /insercao/historico:
 *   get:
 *     summary: Histórico de importações
 *     description: Lista todas as importações realizadas
 *     tags: [Importação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Histórico obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     importacoes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           filename:
 *                             type: string
 *                           total_records:
 *                             type: integer
 *                           import_date:
 *                             type: string
 *                             format: date-time
 *                           all_processed:
 *                             type: boolean
 *                     total:
 *                       type: integer
 *                 message:
 *                   type: string
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/historico',
  authenticateToken,
  asyncHandler(csvController.historico)
);

/**
 * @swagger
 * /insercao/historico/{filename}:
 *   get:
 *     summary: Detalhes de importação específica
 *     description: Obtém detalhes de uma importação específica
 *     tags: [Importação]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do arquivo importado
 *     responses:
 *       200:
 *         description: Detalhes obtidos com sucesso
 *       401:
 *         description: Token inválido
 *       404:
 *         description: Importação não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/historico/:filename',
  authenticateToken,
  asyncHandler(csvController.detalhesImportacao)
);

/**
 * @swagger
 * /insercao/template:
 *   get:
 *     summary: Download do template CSV
 *     description: Baixa arquivo template CSV com formato correto para importação
 *     tags: [Importação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template CSV
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: |
 *                 smartico_user_id,user_ext_id,core_sm_brand_id,crm_brand_id,ext_brand_id,crm_brand_name,promocao_nome,regras,data_inicio,data_fim
 *                 123456789,user_ext_001,1,100,brand_001,Marca Exemplo,Promoção de Boas-vindas,Regras da promoção aqui,2024-01-01 00:00:00,2024-12-31 23:59:59
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/template',
  authenticateToken,
  asyncHandler(csvController.template)
);

/**
 * @swagger
 * /insercao/health:
 *   get:
 *     summary: Verifica saúde do serviço de importação
 *     description: Endpoint para monitoramento da saúde do serviço
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Serviço funcionando corretamente
 *       503:
 *         description: Serviço com problemas
 */
router.get('/health',
  asyncHandler(csvController.health)
);

export default router;