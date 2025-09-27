// import fs from 'fs';
// import path from 'path';
// import { CSVProcessor } from '../services/csvProcessor';
// import { PromotionUser } from '../models/PromotionUser';
// import { connectDB, disconnectDB } from '../config/database';

// // Mock data para testes
// const mockCSVData = `smartico_user_id,user_ext_id,core_sm_brand_id,crm_brand_id,ext_brand_id,crm_brand_name
// 65020111,177805,627,627,a7kbetbr,bet7k
// 65020112,177806,627,627,a7kbetbr,bet7k
// 65020113,177807,628,628,pixbetbr,pixbet
// 65020114,177808,629,629,sportingbetbr,sportingbet`;

// describe('CSV Processor', () => {
//   let testFilePath: string;
  
//   beforeAll(async () => {
//     // Conecta ao banco de dados de teste
//     process.env.MONGODB_URI = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
//     await connectDB();
    
//     // Cria arquivo CSV de teste
//     testFilePath = path.join(__dirname, 'test-data.csv');
//     fs.writeFileSync(testFilePath, mockCSVData);
//   });

//   afterAll(async () => {
//     // Limpa dados de teste
//     await PromotionUser.deleteMany({});
    
//     // Remove arquivo de teste
//     if (fs.existsSync(testFilePath)) {
//       fs.unlinkSync(testFilePath);
//     }
    
//     await disconnectDB();
//   });

//   beforeEach(async () => {
//     // Limpa dados antes de cada teste
//     await PromotionUser.deleteMany({});
//   });

//   describe('processCSV', () => {
//     it('deve processar arquivo CSV corretamente', async () => {
//       const processor = new CSVProcessor(2); // Batch pequeno para teste
      
//       const result = await processor.processCSV(
//         testFilePath,
//         'test-file.csv',
//         'test-promo-001'
//       );

//       expect(result.totalRows).toBe(4);
//       expect(result.processedRows).toBe(4);
//       expect(result.newUsers).toBe(4);
//       expect(result.updatedUsers).toBe(0);
//       expect(result.errors).toHaveLength(0);
//     });

//     it('deve atualizar usuários existentes sem duplicar', async () => {
//       const processor = new CSVProcessor();
      
//       // Primeiro processamento
//       await processor.processCSV(
//         testFilePath,
//         'test-file-1.csv',
//         'test-promo-001'
//       );

//       // Segundo processamento com mesmos usuários, promoção diferente
//       const result = await processor.processCSV(
//         testFilePath,
//         'test-file-2.csv',
//         'test-promo-002'
//       );

//       expect(result.newUsers).toBe(0); // Não deve criar novos usuários
//       expect(result.updatedUsers).toBe(4); // Deve atualizar os existentes

//       // Verifica se usuários têm ambas as promoções
//       const user = await PromotionUser.findOne({ smartico_user_id: 65020111 });
//       expect(user?.current_promotions).toContain('test-promo-001');
//       expect(user?.current_promotions).toContain('test-promo-002');
//     });
//   });

//   describe('findUsersInPromotion', () => {
//     beforeEach(async () => {
//       // Cria dados de teste
//       const processor = new CSVProcessor();
//       await processor.processCSV(
//         testFilePath,
//         'test-file.csv',
//         'test-promo-001'
//       );
//     });

//     it('deve encontrar usuários em uma promoção', async () => {
//       const result = await CSVProcessor.findUsersInPromotion('test-promo-001', 1, 10);
      
//       expect(result.total).toBe(4);
//       expect(result.users).toHaveLength(4);
//       expect(result.page).toBe(1);
//       expect(result.totalPages).toBe(1);
//     });

//     it('deve retornar lista vazia para promoção inexistente', async () => {
//       const result = await CSVProcessor.findUsersInPromotion('promo-inexistente', 1, 10);
      
//       expect(result.total).toBe(0);
//       expect(result.users).toHaveLength(0);
//     });
//   });

//   describe('isUserInPromotion', () => {
//     beforeEach(async () => {
//       const processor = new CSVProcessor();
//       await processor.processCSV(
//         testFilePath,
//         'test-file.csv',
//         'test-promo-001'
//       );
//     });

//     it('deve retornar true para usuário na promoção', async () => {
//       const isInPromotion = await CSVProcessor.isUserInPromotion(65020111, 'test-promo-001');
//       expect(isInPromotion).toBe(true);
//     });

//     it('deve retornar false para usuário não na promoção', async () => {
//       const isInPromotion = await CSVProcessor.isUserInPromotion(65020111, 'promo-inexistente');
//       expect(isInPromotion).toBe(false);
//     });

//     it('deve retornar false para usuário inexistente', async () => {
//       const isInPromotion = await CSVProcessor.isUserInPromotion(99999999, 'test-promo-001');
//       expect(isInPromotion).toBe(false);
//     });
//   });

//   describe('getPromotionStats', () => {
//     beforeEach(async () => {
//       const processor = new CSVProcessor();
//       await processor.processCSV(
//         testFilePath,
//         'test-file.csv',
//         'test-promo-001'
//       );
//     });

//     it('deve retornar estatísticas corretas da promoção', async () => {
//       const stats = await CSVProcessor.getPromotionStats('test-promo-001');
      
//       expect(stats.totalUsers).toBe(4);
//       expect(stats.activeUsers).toBe(4);
//       expect(stats.inactiveUsers).toBe(0);
//       expect(stats.files).toContain('test-file.csv');
//     });
//   });

//   describe('PromotionUser Model Methods', () => {
//     it('deve adicionar promoção corretamente', async () => {
//       const user = new PromotionUser({
//         smartico_user_id: 12345,
//         user_ext_id: 'test123',
//         core_sm_brand_id: 100,
//         crm_brand_id: 100,
//         ext_brand_id: 'testbrand',
//         crm_brand_name: 'Test Brand',
//       });

//       user.addPromotion('test-promo', 'test-file.csv');
      
//       expect(user.current_promotions).toContain('test-promo');
//       expect(user.promotion_history).toHaveLength(1);
//       expect(user.file_history).toHaveLength(1);
//     });

//     it('deve verificar se usuário está em promoção', async () => {
//       const user = new PromotionUser({
//         smartico_user_id: 12345,
//         user_ext_id: 'test123',
//         core_sm_brand_id: 100,
//         crm_brand_id: 100,
//         ext_brand_id: 'testbrand',
//         crm_brand_name: 'Test Brand',
//         current_promotions: ['test-promo'],
//       });

//       expect(user.isInPromotion('test-promo')).toBe(true);
//       expect(user.isInPromotion('other-promo')).toBe(false);
//     });

//     it('deve remover promoção corretamente', async () => {
//       const user = new PromotionUser({
//         smartico_user_id: 12345,
//         user_ext_id: 'test123',
//         core_sm_brand_id: 100,
//         crm_brand_id: 100,
//         ext_brand_id: 'testbrand',
//         crm_brand_name: 'Test Brand',
//         current_promotions: ['test-promo'],
//         promotion_history: [{
//           promotion_id: 'test-promo',
//           filename: 'test.csv',
//           added_date: new Date(),
//           status: 'active',
//         }],
//       });

//       user.removePromotion('test-promo');
      
//       expect(user.current_promotions).not.toContain('test-promo');
//       expect(user.promotion_history[0].status).toBe('inactive');
//     });
//   });
// });