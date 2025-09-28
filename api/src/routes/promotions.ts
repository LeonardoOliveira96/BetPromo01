import { Router } from 'express';
import { PromotionController } from '../controllers/promotionController';
import { authenticateToken } from '../middlewares/auth';
import { validateRequest, asyncHandler } from '../middlewares/errorHandler';
import { promocaoSchema } from '../schemas/validation';

/**
 * Rotas de promoções
 * Define endpoints para criação, listagem e gerenciamento de promoções
 */
const router = Router();
const promotionController = new PromotionController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Promotion:
 *       type: object
 *       required:
 *         - nome
 *       properties:
 *         promocao_id:
 *           type: integer
 *           description: ID único da promoção
 *         nome:
 *           type: string
 *           description: Nome da promoção
 *           maxLength: 255
 *         regras:
 *           type: string
 *           description: Regras e condições da promoção
 *         data_inicio:
 *           type: string
 *           format: date-time
 *           description: Data e hora de início da promoção
 *         data_fim:
 *           type: string
 *           format: date-time
 *           description: Data e hora de fim da promoção
 *         status:
 *           type: string
 *           enum: [active, inactive, expired, scheduled]
 *           description: Status da promoção
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Data de última atualização
 *     
 *     CreatePromotionRequest:
 *       type: object
 *       required:
 *         - nome
 *       properties:
 *         nome:
 *           type: string
 *           description: Nome da promoção
 *           maxLength: 255
 *         regras:
 *           type: string
 *           description: Regras e condições da promoção
 *         data_inicio:
 *           type: string
 *           format: date-time
 *           description: Data e hora de início da promoção
 *         data_fim:
 *           type: string
 *           format: date-time
 *           description: Data e hora de fim da promoção
 *         status:
 *           type: string
 *           enum: [active, inactive, scheduled]
 *           default: active
 *           description: Status da promoção
 *         targetUserIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: IDs dos usuários específicos (opcional)
 *         scheduleActivation:
 *           type: boolean
 *           description: Se deve agendar ativação automática
 */

/**
 * @swagger
 * /api/promocoes:
 *   post:
 *     summary: Criar nova promoção
 *     description: Cria uma nova promoção no sistema
 *     tags: [Promoções]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePromotionRequest'
 *     responses:
 *       201:
 *         description: Promoção criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *                 message:
 *                   type: string
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token de acesso inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/',
  authenticateToken,
  asyncHandler(promotionController.createPromotion.bind(promotionController))
);

/**
 * @swagger
 * /api/promocoes:
 *   get:
 *     summary: Listar promoções
 *     description: Lista todas as promoções com filtros opcionais
 *     tags: [Promoções]
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
 *           default: 10
 *         description: Itens por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, expired, scheduled]
 *         description: Filtrar por status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nome
 *     responses:
 *       200:
 *         description: Lista de promoções
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
 *                     $ref: '#/components/schemas/Promotion'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Token de acesso inválido
 */
router.get('/',
  authenticateToken,
  asyncHandler(promotionController.getPromotions.bind(promotionController))
);

/**
 * @swagger
 * /api/promocoes/{id}:
 *   get:
 *     summary: Obter promoção por ID
 *     description: Retorna uma promoção específica
 *     tags: [Promoções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da promoção
 *     responses:
 *       200:
 *         description: Promoção encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *       404:
 *         description: Promoção não encontrada
 *       401:
 *         description: Token de acesso inválido
 */
router.get('/:id',
  authenticateToken,
  asyncHandler(promotionController.getPromotionById.bind(promotionController))
);

/**
 * @swagger
 * /api/promocoes/{id}:
 *   put:
 *     summary: Atualizar promoção
 *     description: Atualiza uma promoção existente
 *     tags: [Promoções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da promoção
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePromotionRequest'
 *     responses:
 *       200:
 *         description: Promoção atualizada com sucesso
 *       404:
 *         description: Promoção não encontrada
 *       401:
 *         description: Token de acesso inválido
 */
router.put('/:id',
  authenticateToken,
  validateRequest(promocaoSchema),
  asyncHandler(promotionController.updatePromotion.bind(promotionController))
);

/**
 * @swagger
 * /api/promocoes/{id}:
 *   delete:
 *     summary: Deletar promoção
 *     description: Remove uma promoção do sistema
 *     tags: [Promoções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da promoção
 *     responses:
 *       200:
 *         description: Promoção deletada com sucesso
 *       404:
 *         description: Promoção não encontrada
 *       401:
 *         description: Token de acesso inválido
 */
router.delete('/:id',
  authenticateToken,
  asyncHandler(promotionController.deletePromotion.bind(promotionController))
);

export default router;