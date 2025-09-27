import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken } from '../middlewares/auth';
import { validateRequest, asyncHandler } from '../middlewares/errorHandler';
import { consultaQuerySchema } from '../schemas/validation';

/**
 * Rotas de usuários
 * Define endpoints para consulta de usuários e promoções
 */
const router = Router();
const userController = new UserController();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserWithPromotions:
 *       type: object
 *       properties:
 *         smartico_user_id:
 *           type: integer
 *           description: ID único do usuário
 *         user_ext_id:
 *           type: string
 *           description: ID externo do usuário
 *         core_sm_brand_id:
 *           type: integer
 *           description: ID da marca no core
 *         crm_brand_id:
 *           type: integer
 *           description: ID da marca no CRM
 *         ext_brand_id:
 *           type: string
 *           description: ID externo da marca
 *         crm_brand_name:
 *           type: string
 *           description: Nome da marca no CRM
 *         promocoes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               promocao_id:
 *                 type: integer
 *               nome:
 *                 type: string
 *               regras:
 *                 type: string
 *               data_inicio:
 *                 type: string
 *                 format: date-time
 *               data_fim:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *     ConsultaResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             users:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserWithPromotions'
 *             pagination:
 *               type: object
 *               properties:
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalItems:
 *                   type: integer
 *                 itemsPerPage:
 *                   type: integer
 *                 hasNext:
 *                   type: boolean
 *                 hasPrev:
 *                   type: boolean
 *             summary:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                 activePromotions:
 *                   type: integer
 *                 uniqueBrands:
 *                   type: integer
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /consulta:
 *   get:
 *     summary: Consulta usuários com promoções
 *     description: Retorna dados da tabela usuarios_final com promoções vigentes e detalhes
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Itens por página
 *       - in: query
 *         name: smartico_user_id
 *         schema:
 *           type: integer
 *         description: Filtrar por ID do usuário
 *       - in: query
 *         name: core_sm_brand_id
 *         schema:
 *           type: integer
 *         description: Filtrar por ID da marca no core
 *       - in: query
 *         name: crm_brand_id
 *         schema:
 *           type: integer
 *         description: Filtrar por ID da marca no CRM
 *       - in: query
 *         name: ext_brand_id
 *         schema:
 *           type: string
 *         description: Filtrar por ID externo da marca
 *       - in: query
 *         name: crm_brand_name
 *         schema:
 *           type: string
 *         description: Filtrar por nome da marca
 *       - in: query
 *         name: promocao_nome
 *         schema:
 *           type: string
 *         description: Filtrar por nome da promoção
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, expired]
 *           default: active
 *         description: Filtrar por status da promoção
 *       - in: query
 *         name: data_inicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar por data de início (YYYY-MM-DD)
 *       - in: query
 *         name: data_fim
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar por data de fim (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Consulta realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConsultaResponse'
 *       400:
 *         description: Parâmetros inválidos
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/',
  authenticateToken,
  validateRequest(consultaQuerySchema, 'query'),
  asyncHandler(userController.consulta)
);

/**
 * @swagger
 * /consulta/{id}:
 *   get:
 *     summary: Consulta usuário específico
 *     description: Retorna dados de um usuário específico com suas promoções
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário (smartico_user_id)
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserWithPromotions'
 *                 message:
 *                   type: string
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Token inválido
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:id',
  authenticateToken,
  asyncHandler(userController.consultaById)
);

/**
 * @swagger
 * /consulta/{id}/historico:
 *   get:
 *     summary: Histórico de promoções do usuário
 *     description: Retorna histórico completo de promoções de um usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário (smartico_user_id)
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
 *                     smartico_user_id:
 *                       type: integer
 *                     historico:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           promocao_id:
 *                             type: integer
 *                           filename:
 *                             type: string
 *                           added_date:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                           regras:
 *                             type: string
 *                           data_inicio:
 *                             type: string
 *                             format: date-time
 *                           data_fim:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:id/historico',
  authenticateToken,
  asyncHandler(userController.historicoById)
);

/**
 * @swagger
 * /consulta/system/stats:
 *   get:
 *     summary: Estatísticas do sistema
 *     description: Retorna estatísticas gerais do sistema
 *     tags: [Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas obtidas com sucesso
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/system/stats',
  authenticateToken,
  asyncHandler(userController.stats)
);

/**
 * @swagger
 * /consulta/system/brands:
 *   get:
 *     summary: Lista de marcas
 *     description: Retorna lista de marcas com contagem de usuários
 *     tags: [Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Marcas obtidas com sucesso
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/system/brands',
  authenticateToken,
  asyncHandler(userController.brands)
);

/**
 * @swagger
 * /consulta/health:
 *   get:
 *     summary: Verifica saúde do serviço de usuários
 *     description: Endpoint para monitoramento da saúde do serviço
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Serviço funcionando corretamente
 *       503:
 *         description: Serviço com problemas
 */
router.get('/health',
  asyncHandler(userController.health)
);

export default router;