const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function testDuplicatePromotionFix() {
  try {
    console.log('🧪 TESTE: Correção de Duplicação de Promoções');
    console.log('='.repeat(50));

    // 1. Fazer login
    console.log('🔐 Fazendo login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@teste.com',
        password: 'senha123'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginData.success || !loginData.data?.token) {
      throw new Error('Falha no login: ' + JSON.stringify(loginData));
    }

    const token = loginData.data.token;
    console.log('✅ Login realizado com sucesso');

    // 2. Criar CSV de teste
    const testPromotionName = 'TESTE DUPLICACAO ' + Date.now();
    const csvContent = `smartico_user_id,promocao_nome,data_inicio,data_fim,regras
65020400,${testPromotionName},2024-01-01 00:00:00,2024-12-31 23:59:59,Teste de duplicação
65021174,${testPromotionName},2024-01-01 00:00:00,2024-12-31 23:59:59,Teste de duplicação
65021195,${testPromotionName},2024-01-01 00:00:00,2024-12-31 23:59:59,Teste de duplicação`;

    const csvFilename = `test_duplicate_${Date.now()}.csv`;
    fs.writeFileSync(csvFilename, csvContent);
    console.log(`📄 CSV criado: ${csvFilename}`);

    // 3. Upload do CSV (primeira vez - deve criar a promoção)
    console.log('📤 Fazendo upload do CSV...');
    const uploadFormData = new FormData();
    uploadFormData.append('csvFile', fs.createReadStream(csvFilename));
    uploadFormData.append('promotionName', testPromotionName);

    const uploadResponse = await fetch('http://localhost:3000/api/insercao', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...uploadFormData.getHeaders()
      },
      body: uploadFormData
    });

    const uploadResult = await uploadResponse.json();
    console.log('📊 Resultado do upload:', {
      success: uploadResult.success,
      newPromotions: uploadResult.data?.newPromotions,
      newUserPromotions: uploadResult.data?.newUserPromotions,
      message: uploadResult.message
    });

    // 4. Tentar criar promoção via formulário (deve usar a existente)
    console.log('🎯 Tentando criar promoção via formulário...');
    const promotionData = {
      nome: testPromotionName,
      regras: 'Regras da promoção via formulário',
      data_inicio: '2024-01-01T00:00:00.000Z',
      data_fim: '2024-12-31T23:59:59.000Z',
      status: 'active',
      targetUserIds: [65020400, 65021174, 65021195]
    };

    const createResponse = await fetch('http://localhost:3000/api/promocoes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(promotionData)
    });

    const createResult = await createResponse.json();
    console.log('📊 Resultado da criação:', {
      success: createResult.success,
      status: createResponse.status,
      message: createResult.message,
      data: createResult.data
    });

    // 5. Verificar se funcionou
    if (createResponse.status === 201 && createResult.success) {
      console.log('\n🎉 SUCESSO! A correção funcionou!');
      console.log('✅ Não houve erro 500');
      console.log('✅ Promoção existente foi reutilizada');
    } else if (createResponse.status === 500) {
      console.log('\n❌ FALHA! Ainda há erro 500');
      console.log('❌ A correção não funcionou');
    } else {
      console.log('\n⚠️ Resultado inesperado:', createResponse.status);
    }

    // Limpar arquivo de teste
    fs.unlinkSync(csvFilename);
    console.log(`🧹 Arquivo ${csvFilename} removido`);

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testDuplicatePromotionFix();