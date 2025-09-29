const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testFrontendUpload() {
  console.log('🧪 Testando upload do frontend com promoção "porrco"...\n');

  try {
    // Criar FormData como o frontend faz
    const formData = new FormData();
    
    // Adicionar o arquivo CSV
    const csvContent = `id_usuario,promocao_nome
888001,Promoção Padrão bet7k
888002,Promoção Padrão bet7k
888003,Promoção Padrão bet7k`;
    
    fs.writeFileSync('test_porrco.csv', csvContent);
    formData.append('file', fs.createReadStream('test_porrco.csv'));
    
    // IMPORTANTE: Adicionar o promotionName como o frontend faz
    formData.append('promotionName', 'porrco');
    
    console.log('📤 Enviando dados:');
    console.log('   - Arquivo: test_porrco.csv');
    console.log('   - promotionName: "porrco"');
    console.log('   - Conteúdo CSV: usuários com "Promoção Padrão bet7k"\n');

    // Fazer a requisição para a API
    const response = await fetch('http://localhost:3000/api/insercao', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    const result = await response.text();
    console.log('📥 Resposta da API:');
    console.log('Status:', response.status);
    console.log('Resposta:', result);

    // Limpar arquivo de teste
    fs.unlinkSync('test_porrco.csv');

    if (response.ok) {
      console.log('\n✅ Upload realizado com sucesso!');
      console.log('🔍 Agora verifique se os usuários foram vinculados à promoção "porrco"');
    } else {
      console.log('\n❌ Erro no upload:', result);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testFrontendUpload();