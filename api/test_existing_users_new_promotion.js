const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testExistingUsersNewPromotion() {
  console.log('🧪 Testando vinculação de usuários EXISTENTES à nova promoção...\n');

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

    // Passo 2: Usar usuários que já existem no sistema
    // Vamos usar o usuário 65020400 que sabemos que existe
    const existingUsers = [
      '65020400',  // Usuário que já existe
      '65021174',  // Outro usuário existente
      '65021195'   // Mais um usuário existente
    ];

    console.log('👥 Usuários existentes que serão testados:');
    existingUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user}`);
    });
    console.log('');

    // Passo 3: Criar FormData com usuários existentes
    const formData = new FormData();
    
    // Criar arquivo CSV com usuários existentes
    const csvContent = `id_usuario,promocao_nome
${existingUsers.map(user => `${user},Promoção Padrão bet7k`).join('\n')}`;
    
    fs.writeFileSync('test_existing_users.csv', csvContent);
    formData.append('file', fs.createReadStream('test_existing_users.csv'));
    
    // IMPORTANTE: Definir o nome da nova promoção
    const newPromotionName = 'NOVA PROMOÇÃO PARA USUÁRIOS EXISTENTES';
    formData.append('promotionName', newPromotionName);
    
    console.log('📤 Enviando dados:');
    console.log('   - Usuários: EXISTENTES no sistema');
    console.log('   - CSV contém: "Promoção Padrão bet7k"');
    console.log('   - promotionName: "' + newPromotionName + '"');
    console.log('   - Expectativa: usuários serão MOVIDOS para a nova promoção');
    console.log('');

    // Passo 4: Fazer upload
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
    fs.unlinkSync('test_existing_users.csv');

    if (uploadResponse.ok) {
      console.log('\n✅ Upload realizado com sucesso!');
      
      try {
        const parsedResult = JSON.parse(result);
        console.log('📊 Dados processados:', JSON.stringify(parsedResult, null, 2));
        
        if (parsedResult.success) {
          console.log('\n🎯 RESULTADO ESPERADO:');
          console.log('======================');
          console.log('✅ Os usuários existentes agora devem estar vinculados à:');
          console.log(`   "${newPromotionName}"`);
          console.log('✅ Suas vinculações antigas devem estar inativas');
          console.log('');
          console.log('🔍 Para verificar:');
          console.log('1. Execute: node check_latest_imports.js');
          console.log('2. Busque os usuários no frontend');
          console.log('3. Verifique se eles aparecem na nova promoção');
          
          console.log('\n📈 Estatísticas:');
          console.log(`   - Usuários processados: ${parsedResult.data.processedRows}`);
          console.log(`   - Novos usuários: ${parsedResult.data.newUsers}`);
          console.log(`   - Novas promoções: ${parsedResult.data.newPromotions}`);
          console.log(`   - Novas vinculações: ${parsedResult.data.newUserPromotions}`);
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

testExistingUsersNewPromotion();