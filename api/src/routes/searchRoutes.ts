import { Router } from 'express';
import { SearchController } from '../controllers/searchController';

const router = Router();

/**
 * @route GET /api/search/users
 * @desc Busca usuários por smartico_user_id ou user_ext_id
 * @query {string} query - Termo de busca
 * @query {string} type - Tipo de busca: 'smartico_user_id', 'user_ext_id' ou 'both'
 * @query {number} [limit=50] - Limite de resultados (máximo 100)
 * @query {number} [page=1] - Página para paginação
 * @access Public (pode ser protegido com middleware de autenticação se necessário)
 */
router.get('/users', SearchController.searchUsers);

/**
 * @route GET /api/search/users/:id
 * @desc Busca detalhes de um usuário específico
 * @param {string} id - ID do usuário (smartico_user_id ou user_ext_id)
 * @query {string} [type=smartico_user_id] - Tipo do ID: 'smartico_user_id' ou 'user_ext_id'
 * @access Public
 */
router.get('/users/:id', SearchController.getUserDetails);

/**
 * @route GET /api/search/quick
 * @desc Busca rápida para autocomplete
 * @query {string} query - Termo de busca (mínimo 2 caracteres)
 * @access Public
 */
router.get('/quick', SearchController.quickSearch);

export default router;