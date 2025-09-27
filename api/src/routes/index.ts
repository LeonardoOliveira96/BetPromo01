import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import csvRoutes from './csv';

/**
 * Configuração principal das rotas da API
 * Organiza e exporta todas as rotas disponíveis
 */
const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Autenticação
 *     description: Endpoints de autenticação e autorização
 *   - name: Usuários
 *     description: Endpoints para consulta de usuários e promoções
 *   - name: Importação
 *     description: Endpoints para upload e processamento de arquivos CSV
 *   - name: Sistema
 *     description: Endpoints de sistema e monitoramento
 */

// Rotas de autenticação
// Endpoints: /auth/login, /auth/logout, /auth/me, /auth/refresh, /auth/health
router.use('/auth', authRoutes);

// Rotas de consulta de usuários
// Endpoints: /consulta, /consulta/:id, /consulta/:id/historico, /consulta/system/stats, /consulta/system/brands, /consulta/health
router.use('/consulta', userRoutes);

// Rotas de importação CSV
// Endpoints: /insercao, /insercao/validate, /insercao/historico, /insercao/historico/:filename, /insercao/template, /insercao/health
router.use('/insercao', csvRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Endpoint raiz da API
 *     description: Retorna informações básicas da API
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Informações da API
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
 *                     name:
 *                       type: string
 *                     version:
 *                       type: string
 *                     description:
 *                       type: string
 *                     endpoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                 message:
 *                   type: string
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'BetPromo API',
      version: '1.0.0',
      description: 'API para gerenciamento de usuários e promoções',
      endpoints: [
        'POST /auth/login - Autenticação de usuário',
        'POST /auth/logout - Logout de usuário',
        'GET /auth/me - Dados do usuário autenticado',
        'GET /consulta - Consulta usuários com promoções',
        'GET /consulta/:id - Consulta usuário específico',
        'GET /consulta/:id/historico - Histórico de promoções do usuário',
        'POST /insercao - Upload e processamento de CSV',
        'GET /insercao/historico - Histórico de importações',
        'GET /insercao/template - Download template CSV',
        'GET /docs - Documentação Swagger'
      ],
      documentation: '/docs',
      health: {
        auth: '/auth/health',
        users: '/consulta/health',
        csv: '/insercao/health'
      }
    },
    message: 'BetPromo API funcionando corretamente'
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check geral da API
 *     description: Verifica saúde geral de todos os serviços
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: API funcionando corretamente
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
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                     environment:
 *                       type: string
 *                     version:
 *                       type: string
 *                 message:
 *                   type: string
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    },
    message: 'API funcionando corretamente'
  });
});

export default router;