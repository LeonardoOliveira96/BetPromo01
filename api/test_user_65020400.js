const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testUser65020400() {
  console.log('🧪 Testando correção com o usuário 65020400...\n');

  try {
    // Passo 1: Fazer login para obter token válido
    console.log('🔐 Fazendo login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@teste.com',
        password: 'senha123'
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Erro no login: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    if (!loginData.success || !loginData.data?.token) {
      throw new Error('Login falhou: ' + loginData.message);
    }

    const token = loginData.data.token;
    console.log('✅ Login realizado com sucesso!\n');

    // Passo 2: Criar FormData com o usuário 65020400
    const formData = new FormData();
    
    // Criar arquivo CSV de teste com o usuário real
    const csvContent = `id_usuario,promocao_nome
65020400,Promoção Padrão bet7k`;
    
    fs.writeFileSync('test_user_65020400.csv', csvContent);
    formData.append('file', fs.createReadStream('test_user_65020400.csv'));
    
    // IMPORTANTE: Definir o nome da promoção que queremos
    const promotionName = 'TESTE USUÁRIO 65020400';
    formData.append('promotionName', promotionName);
    
    console.log('📤 Enviando dados:');
    console.log('   - Usuário: 65020400 (usuário real do sistema)');
    console.log('   - CSV contém: "Promoção Padrão bet7k"');
    console.log('   - promotionName: "' + promotionName + '"');
    console.log('   - Expectativa: usuário será vinculado à "' + promotionName + '"');
    console.log('');

    // Passo 3: Fazer upload
    const uploadResponse = await fetch('http://localhost:3000/api/insercao', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });

    console.log('📥 Resposta da API:');
    console.log('Status:', uploadResponse.status);
    
    const result = await uploadResponse.text();
    console.log('Resposta:', result);

    // Limpar arquivo de teste
    fs.unlinkSync('test_user_65020400.csv');

    if (uploadResponse.ok) {
      console.log('\n✅ Upload realizado com sucesso!');
      
      try {
        const parsedResult = JSON.parse(result);
        console.log('📊 Dados processados:', JSON.stringify(parsedResult, null, 2));
        
        if (parsedResult.success) {
          console.log('\n🎯 RESULTADO ESPERADO:');
          console.log('======================');
          console.log('✅ O usuário 65020400 agora deve estar vinculado à promoção:');
          console.log(`   "${promotionName}"`);
          console.log('');
          console.log('🔍 Para verificar:');
          console.log('1. Busque o usuário 65020400 no frontend');
          console.log('2. Verifique se ele aparece vinculado à nova promoção');
          console.log('3. Execute: node check_latest_imports.js');
        }
      } catch (e) {
        console.log('⚠️ Resposta não é JSON válido');
      }
    } else {
      console.log('\n❌ Erro no upload');
      try {
        const errorData = JSON.parse(result);
        console.log('❌ Detalhes do erro:', errorData);
      } catch (e) {
        console.log('❌ Erro não estruturado:', result);
      }
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testUser65020400();