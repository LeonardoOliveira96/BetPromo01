import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';
import { validateRequest, asyncHandler } from '../middlewares/errorHandler';
import { loginSchema } from '../schemas/validation';

/**
 * Rotas de autenticação
 * Define endpoints para login, logout e perfil do usuário
 */
const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email do usuário
 *         password:
 *           type: string
 *           minLength: 6
 *           description: Senha do usuário
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: JWT token
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 email:
 *                   type: string
 *                 name:
 *                   type: string
 *                 role:
 *                   type: string
 *                 isActive:
 *                   type: boolean
 *             expiresIn:
 *               type: string
 *               description: Tempo de expiração do token
 *         message:
 *           type: string
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autentica usuário
 *     description: Realiza login do usuário e retorna JWT token
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "admin@example.com"
 *             password: "senha123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Credenciais inválidas
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/login', 
  validateRequest(loginSchema),
  asyncHandler(authController.login)
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Realiza logout
 *     description: Invalida o token JWT atual
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/logout',
  authenticateToken,
  asyncHandler(authController.logout)
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtém dados do usuário autenticado
 *     description: Retorna informações do usuário logado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário obtidos com sucesso
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
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *       401:
 *         description: Token inválido
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/me',
  authenticateToken,
  asyncHandler(authController.me)
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renova token JWT
 *     description: Gera novo token JWT (funcionalidade futura)
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Funcionalidade não implementada
 */
router.post('/refresh',
  authenticateToken,
  asyncHandler(authController.refresh)
);

/**
 * @swagger
 * /auth/health:
 *   get:
 *     summary: Verifica saúde do serviço de autenticação
 *     description: Endpoint para monitoramento da saúde do serviço
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Serviço funcionando corretamente
 *       503:
 *         description: Serviço com problemas
 */
router.get('/health',
  asyncHandler(authController.health)
);

export default router;