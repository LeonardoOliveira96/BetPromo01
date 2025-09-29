const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testRealFrontendFlow() {
  console.log('🧪 Testando fluxo real do frontend com login e token válido...\n');

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
    console.log('✅ Login realizado com sucesso!');
    console.log('🎫 Token obtido:', token.substring(0, 20) + '...\n');

    // Passo 2: Criar FormData exatamente como o frontend
    const formData = new FormData();
    
    // Criar arquivo CSV de teste
    const csvContent = `id_usuario,promocao_nome
888001,Promoção Padrão bet7k
888002,Promoção Padrão bet7k
888003,Promoção Padrão bet7k`;
    
    fs.writeFileSync('test_frontend_real.csv', csvContent);
    formData.append('file', fs.createReadStream('test_frontend_real.csv'));
    
    // IMPORTANTE: Adicionar o promotionName como o frontend faz
    const promotionName = 'porrco';
    formData.append('promotionName', promotionName);
    
    console.log('📤 Enviando dados:');
    console.log('   - Arquivo: test_frontend_real.csv');
    console.log('   - promotionName: "' + promotionName + '"');
    console.log('   - Token: válido');
    console.log('   - Conteúdo CSV: usuários com "Promoção Padrão bet7k"\n');

    // Passo 3: Fazer upload exatamente como o frontend
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
    fs.unlinkSync('test_frontend_real.csv');

    if (uploadResponse.ok) {
      console.log('\n✅ Upload realizado com sucesso!');
      console.log('🔍 Agora verifique se os usuários foram vinculados à promoção "' + promotionName + '"');
      
      // Tentar parsear a resposta
      try {
        const parsedResult = JSON.parse(result);
        console.log('📊 Dados processados:', JSON.stringify(parsedResult, null, 2));
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

testRealFrontendFlow();