const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testWithPromotionName() {
  console.log('🧪 TESTE - Iniciando teste com promotionName preenchido...\n');

  try {
    // 1. Fazer login
    console.log('🔐 Fazendo login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@teste.com',
        password: 'senha123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login falhou: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    if (!loginData.success || !loginData.data?.token) {
      throw new Error('Login falhou: ' + loginData.message);
    }
    const token = loginData.data.token;
    console.log('✅ Login bem-sucedido\n');

    // 2. Preparar dados de teste
    const testUsers = [
      { smartico_user_id: '65020400', promocao_nome: 'Promoção Padrão bet7k', brand_name: 'bet7k' },
      { smartico_user_id: '65021174', promocao_nome: 'Promoção Padrão bet7k', brand_name: 'bet7k' },
      { smartico_user_id: '65021195', promocao_nome: 'Promoção Padrão bet7k', brand_name: 'bet7k' }
    ];

    // 3. Criar CSV
    const csvContent = [
      'smartico_user_id,promocao_nome,brand_name',
      ...testUsers.map(user => `${user.smartico_user_id},${user.promocao_nome},${user.brand_name}`)
    ].join('\n');

    const csvFilename = 'test_promotion_name.csv';
    fs.writeFileSync(csvFilename, csvContent);
    console.log('📄 CSV criado:', csvFilename);
    console.log('📋 Conteúdo do CSV:');
    console.log(csvContent);
    console.log('');

    // 4. Enviar para API com promotionName
    console.log('📤 Enviando CSV para API com promotionName...');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(csvFilename));
    formData.append('promotionName', 'TESTE COM PROMOTION NAME PREENCHIDO');

    console.log('🏷️ promotionName enviado: "TESTE COM PROMOTION NAME PREENCHIDO"');

    const uploadResponse = await fetch('http://localhost:3000/api/insercao', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload falhou: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload bem-sucedido:');
    console.log(JSON.stringify(uploadResult, null, 2));

    // 5. Limpar arquivo temporário
    fs.unlinkSync(csvFilename);
    console.log('🗑️ Arquivo temporário removido');

    console.log('\n🎯 RESULTADO ESPERADO:');
    console.log('- Os usuários devem ser vinculados à promoção "TESTE COM PROMOTION NAME PREENCHIDO"');
    console.log('- As vinculações antigas devem ser desativadas');
    console.log('- O nome da promoção do CSV deve ser ignorado');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testWithPromotionName();