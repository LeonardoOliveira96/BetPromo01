/**
 * EXEMPLOS DE USO DO SISTEMA DE PROCESSAMENTO DE CSV
 * 
 * Este arquivo contém exemplos práticos de como usar o sistema de processamento
 * de CSV para gerenciar usuários de promoções.
 */

import { CSVProcessor } from '../services/csvProcessor';
import { PromotionUser } from '../models/PromotionUser';

/**
 * EXEMPLO 1: Processamento de arquivo CSV
 * 
 * Como processar um arquivo CSV com dados de usuários
 */
export async function exemploProcessamentoCSV() {
  const processor = new CSVProcessor(1000); // Batch de 1000 registros
  
  try {
    const resultado = await processor.processCSV(
      '/caminho/para/arquivo.csv',
      'setembro_users.csv',
      'promo_2024_09_27'
    );
    
    console.log('Resultado do processamento:', {
      totalLinhas: resultado.totalRows,
      processadas: resultado.processedRows,
      novosUsuarios: resultado.newUsers,
      usuariosAtualizados: resultado.updatedUsers,
      erros: resultado.errors.length,
      tempoProcessamento: `${resultado.processingTime}ms`,
    });
    
  } catch (error) {
    console.error('Erro no processamento:', error);
  }
}

/**
 * EXEMPLO 2: Buscar usuários em uma promoção
 * 
 * Como buscar usuários que estão participando de uma promoção específica
 */
export async function exemploBuscarUsuariosPromocao() {
  try {
    const resultado = await CSVProcessor.findUsersInPromotion(
      'promo_2024_09_27',
      1, // página
      50 // limite por página
    );
    
    console.log('Usuários na promoção:', {
      total: resultado.total,
      pagina: resultado.page,
      totalPaginas: resultado.totalPages,
      usuarios: resultado.users.length,
    });
    
    // Exemplo de como acessar dados dos usuários
    resultado.users.forEach(user => {
      console.log(`Usuário ${user.smartico_user_id} - ${user.crm_brand_name}`);
    });
    
  } catch (error) {
    console.error('Erro na busca:', error);
  }
}

/**
 * EXEMPLO 3: Verificar se usuário está em promoção
 * 
 * Como verificar rapidamente se um usuário específico está em uma promoção
 */
export async function exemploVerificarUsuario() {
  try {
    const estaParticipando = await CSVProcessor.isUserInPromotion(
      65020111, // smartico_user_id
      'promo_2024_09_27'
    );
    
    console.log(`Usuário 65020111 está na promoção: ${estaParticipando ? 'SIM' : 'NÃO'}`);
    
  } catch (error) {
    console.error('Erro na verificação:', error);
  }
}

/**
 * EXEMPLO 4: Obter estatísticas de uma promoção
 * 
 * Como obter informações estatísticas sobre uma promoção
 */
export async function exemploEstatisticasPromocao() {
  try {
    const stats = await CSVProcessor.getPromotionStats('promo_2024_09_27');
    
    console.log('Estatísticas da promoção:', {
      totalUsuarios: stats.totalUsers,
      usuariosAtivos: stats.activeUsers,
      usuariosInativos: stats.inactiveUsers,
      arquivosProcessados: stats.files,
    });
    
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
  }
}

/**
 * EXEMPLO 5: Consultas avançadas usando o modelo diretamente
 * 
 * Exemplos de consultas mais complexas usando o Mongoose
 */
export async function exemploConsultasAvancadas() {
  try {
    // Buscar usuários de uma marca específica em promoções ativas
    const usuariosBet7k = await PromotionUser.find({
      crm_brand_name: 'bet7k',
      current_promotions: { $ne: [] } // tem pelo menos uma promoção ativa
    }).limit(10);
    
    console.log(`Encontrados ${usuariosBet7k.length} usuários da Bet7k em promoções`);
    
    // Buscar usuários que participaram de múltiplas promoções
    const usuariosMultiplasPromocoes = await PromotionUser.find({
      $expr: { $gt: [{ $size: '$promotion_history' }, 1] }
    }).limit(10);
    
    console.log(`Usuários com múltiplas promoções: ${usuariosMultiplasPromocoes.length}`);
    
    // Buscar usuários por período de criação
    const dataInicio = new Date('2024-09-01');
    const dataFim = new Date('2024-09-30');
    
    const usuariosPeriodo = await PromotionUser.countDocuments({
      created_at: {
        $gte: dataInicio,
        $lte: dataFim
      }
    });
    
    console.log(`Usuários criados em setembro: ${usuariosPeriodo}`);
    
  } catch (error) {
    console.error('Erro nas consultas avançadas:', error);
  }
}

/**
 * EXEMPLO 6: Manipulação de promoções de um usuário
 * 
 * Como adicionar/remover promoções de um usuário específico
 */
export async function exemploManipularPromocoes() {
  try {
    const usuario = await PromotionUser.findOne({ smartico_user_id: 65020111 });
    
    if (usuario) {
      // Adicionar nova promoção
      usuario.addPromotion('promo_2024_10_01', 'outubro_users.csv');
      await usuario.save();
      
      console.log('Promoção adicionada com sucesso');
      
      // Verificar se está na promoção
      const estaParticipando = usuario.isInPromotion('promo_2024_10_01');
      console.log(`Usuário está na nova promoção: ${estaParticipando}`);
      
      // Remover promoção
      usuario.removePromotion('promo_2024_09_27');
      await usuario.save();
      
      console.log('Promoção removida com sucesso');
      
    } else {
      console.log('Usuário não encontrado');
    }
    
  } catch (error) {
    console.error('Erro na manipulação:', error);
  }
}

/**
 * FORMATO ESPERADO DO CSV
 * 
 * O arquivo CSV deve ter as seguintes colunas (header obrigatório):
 * 
 * smartico_user_id,user_ext_id,core_sm_brand_id,crm_brand_id,ext_brand_id,crm_brand_name
 * 65020111,177805,627,627,a7kbetbr,bet7k
 * 65020112,177806,627,627,a7kbetbr,bet7k
 * ...
 * 
 * NOTAS IMPORTANTES:
 * - smartico_user_id deve ser um número inteiro único
 * - Todos os campos são obrigatórios
 * - O sistema não duplica usuários - apenas adiciona novas promoções
 * - Arquivos grandes (1M+ linhas) são processados em batches para eficiência
 * - O processamento é feito de forma transacional para garantir consistência
 */

/**
 * ENDPOINTS DA API REST
 * 
 * POST /api/csv/upload
 * - Upload e processamento de arquivo CSV
 * - Body: multipart/form-data com 'csv_file' e 'promotion_id'
 * 
 * GET /api/csv/promotion/:promotionId/users?page=1&limit=100
 * - Buscar usuários em uma promoção
 * 
 * GET /api/csv/promotion/:promotionId/user/:userId
 * - Verificar se usuário está em promoção
 * 
 * GET /api/csv/promotion/:promotionId/stats
 * - Obter estatísticas da promoção
 * 
 * DELETE /api/csv/promotion/:promotionId/user/:userId
 * - Remover usuário de uma promoção
 */