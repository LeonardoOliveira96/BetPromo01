import { Router } from 'express';
import { CSVController, upload } from '../controllers/csvController';

const router = Router();

/**
 * @route POST /api/csv/upload-progress
 * @desc Upload e processamento de arquivo CSV com progresso em tempo real via SSE
 * @access Private (requer autenticação)
 * @body {string} promotion_id - ID da promoção
 * @file CSV file with columns: smartico_user_id,user_ext_id,core_sm_brand_id,crm_brand_id,ext_brand_id,crm_brand_name
 */
router.post('/upload-progress', upload.single('csv_file'), CSVController.uploadCSVWithProgress);

/**
 * @route POST /api/csv/upload
 * @desc Upload e processamento de arquivo CSV com dados de usuários (método original)
 * @access Private (requer autenticação)
 * @body {string} promotion_id - ID da promoção
 * @file CSV file with columns: smartico_user_id,user_ext_id,core_sm_brand_id,crm_brand_id,ext_brand_id,crm_brand_name
 */
router.post('/upload', upload.single('csv_file'), CSVController.uploadCSV);

/**
 * @route GET /api/csv/promotion/:promotionId/users
 * @desc Busca usuários em uma promoção específica
 * @access Private
 * @params {string} promotionId - ID da promoção
 * @query {number} page - Página (padrão: 1)
 * @query {number} limit - Limite por página (padrão: 100, máximo: 1000)
 */
router.get('/promotion/:promotionId/users', CSVController.getUsersInPromotion);

/**
 * @route GET /api/csv/promotion/:promotionId/user/:userId
 * @desc Verifica se um usuário específico está em uma promoção
 * @access Private
 * @params {string} promotionId - ID da promoção
 * @params {string} userId - smartico_user_id do usuário
 */
router.get('/promotion/:promotionId/user/:userId', CSVController.checkUserInPromotion);

/**
 * @route GET /api/csv/promotion/:promotionId/stats
 * @desc Obtém estatísticas de uma promoção
 * @access Private
 * @params {string} promotionId - ID da promoção
 */
router.get('/promotion/:promotionId/stats', CSVController.getPromotionStats);

/**
 * @route DELETE /api/csv/promotion/:promotionId/user/:userId
 * @desc Remove usuário de uma promoção
 * @access Private
 * @params {string} promotionId - ID da promoção
 * @params {string} userId - smartico_user_id do usuário
 */
router.delete('/promotion/:promotionId/user/:userId', CSVController.removeUserFromPromotion);

export default router;