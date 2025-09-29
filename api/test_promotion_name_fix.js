const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testPromotionNameFix() {
  console.log('🧪 Testando correção do nome da promoção...\n');

  try {
    // Criar FormData
    const formData = new FormData();
    
    // Adicionar arquivo CSV
    const csvPath = './test_promotion_fix.csv';
    const csvStream = fs.createReadStream(csvPath);
    formData.append('file', csvStream, 'test_promotion_fix.csv');
    
    // Adicionar nome da promoção específico
    const promotionName = 'TESTE CORREÇÃO PROMOÇÃO';
    formData.append('promotionName', promotionName);
    
    console.log(`📤 Enviando CSV com promotionName: "${promotionName}"`);
    console.log('📄 Arquivo: test_promotion_fix.csv (3 usuários com "Promoção Padrão bet7k" no CSV)');
    console.log('🎯 Esperado: Usuários devem ser vinculados à promoção "TESTE CORREÇÃO PROMOÇÃO"\n');

    // Fazer upload
    const response = await fetch('http://localhost:3000/api/insercao', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Upload realizado com sucesso!');
      console.log('📊 Resultado:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Erro no upload:', result);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testPromotionNameFix();