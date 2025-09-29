const axios = require('axios');
const FormData = require('form-data');

async function testWithDetailedLogs() {
  console.log('🧪 TESTE COM LOGS DETALHADOS - Vinculação de usuários existentes');
  console.log('================================================================\n');

  try {
    // 1. Login
    console.log('🔐 Fazendo login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@betpromo.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso!\n');

    // 2. Preparar dados de teste
    const testUsers = [
      { id: '65020400', extId: '200400' },
      { id: '65021174', extId: '201174' },
      { id: '65021195', extId: '201195' }
    ];

    console.log('👥 Usuários de teste:', testUsers);

    // 3. Criar CSV com usuários existentes
    const csvContent = [
      'smartico_user_id,user_ext_id,core_sm_brand_id,crm_brand_id,ext_brand_id,crm_brand_name,promocao_nome,regras,data_inicio,data_fim',
      ...testUsers.map(user => 
        `${user.id},${user.extId},1,1,bet7k,bet7k,Promoção Padrão bet7k,Regras da promoção,2024-01-01,2024-12-31`
      )
    ].join('\n');

    console.log('📄 CSV criado:', csvContent.substring(0, 200) + '...\n');

    // 4. Preparar FormData
    const formData = new FormData();
    formData.append('file', Buffer.from(csvContent), {
      filename: 'test-detailed-logs.csv',
      contentType: 'text/csv'
    });
    formData.append('promotionName', 'TESTE COM LOGS DETALHADOS - NOVA PROMOÇÃO');

    console.log('📤 Enviando dados para API...');
    console.log('   - Arquivo: test-detailed-logs.csv');
    console.log('   - promotionName: "TESTE COM LOGS DETALHADOS - NOVA PROMOÇÃO"');
    console.log('   - CSV contém: "Promoção Padrão bet7k"');
    console.log('   - Expectativa: usuários devem ser vinculados à nova promoção\n');

    // 5. Enviar para API
    const uploadResponse = await axios.post(
      'http://localhost:3000/api/insercao',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('📥 Resposta da API:');
    console.log('Status:', uploadResponse.status);
    console.log('Dados:', JSON.stringify(uploadResponse.data, null, 2));

    if (uploadResponse.data.success) {
      console.log('\n✅ Upload realizado com sucesso!');
      console.log('📊 Estatísticas:', uploadResponse.data.data);
      
      console.log('\n🔍 PRÓXIMOS PASSOS:');
      console.log('1. Verifique os logs do servidor para ver o processamento detalhado');
      console.log('2. Execute: node verify_user_promotion_change.js');
      console.log('3. Verifique se os usuários foram movidos para a nova promoção');
      
      console.log('\n💡 ANÁLISE ESPERADA:');
      console.log('- Os logs devem mostrar que o promotionName do frontend foi usado');
      console.log('- As vinculações antigas devem ter sido desativadas');
      console.log('- Novas vinculações devem ter sido criadas para a nova promoção');
    } else {
      console.log('\n❌ Falha no upload:', uploadResponse.data);
    }

  } catch (error) {
    console.error('\n❌ Erro no teste:', error.response?.data || error.message);
  }
}

testWithDetailedLogs();