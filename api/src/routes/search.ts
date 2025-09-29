import { Router } from 'express';
import { SearchController } from '../controllers/searchController';
import { authenticateToken } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

/**
 * Rotas de busca otimizada
 * Define endpoints para busca rápida de usuários por smartico_user_id e user_ext_id
 */
const router = Router();
const searchController = new SearchController();

/**
 * @swagger
 * /search/users:
 *   get:
 *     summary: Busca usuários por smartico_user_id ou user_ext_id
 *     description: Busca otimizada de usuários utilizando índices para performance
 *     tags: [Busca]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo de busca (smartico_user_id ou user_ext_id)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [smartico_user_id, user_ext_id, both]
 *           default: both
 *         description: Tipo de busca
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
 *           default: 20
 *         description: Itens por página
 *     responses:
 *       200:
 *         description: Usuários encontrados
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
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserWithPromotions'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 */
router.get('/users', authenticateToken, asyncHandler(searchController.searchUsers));

/**
 * @swagger
 * /search/users/{id}:
 *   get:
 *     summary: Busca usuário por ID específico
 *     description: Retorna detalhes completos de um usuário incluindo suas promoções ativas
 *     tags: [Busca]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário (smartico_user_id ou user_ext_id)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [smartico_user_id, user_ext_id]
 *           default: smartico_user_id
 *         description: Tipo de ID fornecido
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
 *       404:
 *         description: Usuário não encontrado
 *       400:
 *         description: Parâmetros inválidos
 */
router.get('/users/:id', authenticateToken, asyncHandler(searchController.getUserById));

/**
 * @swagger
 * /search/quick:
 *   get:
 *     summary: Busca rápida para autocomplete
 *     description: Busca rápida limitada para sugestões de autocomplete
 *     tags: [Busca]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo de busca
 *     responses:
 *       200:
 *         description: Sugestões encontradas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       smartico_user_id:
 *                         type: integer
 *                       user_ext_id:
 *                         type: string
 *                       crm_brand_name:
 *                         type: string
 */
router.get('/quick', authenticateToken, asyncHandler(searchController.quickSearch));

export default router;