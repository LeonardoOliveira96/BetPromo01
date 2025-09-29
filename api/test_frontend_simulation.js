const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function simulateFrontendUpload() {
  try {
    console.log('🎭 SIMULANDO UPLOAD DO FRONTEND');
    console.log('='.repeat(60));

    // Criar arquivo CSV de teste
    const csvContent = `smartico_user_id,user_ext_id
666001,frontend_sim_001
666002,frontend_sim_002
666003,frontend_sim_003`;

    const csvPath = path.join(__dirname, 'frontend_simulation.csv');
    fs.writeFileSync(csvPath, csvContent);
    console.log('✅ Arquivo CSV criado:', csvPath);

    // Preparar FormData exatamente como o frontend
    const formData = new FormData();
    formData.append('file', fs.createReadStream(csvPath));
    formData.append('promotionName', 'Pedro Barbeirooo'); // Nome exato da promoção

    console.log('\n📤 ENVIANDO REQUISIÇÃO PARA API:');
    console.log('-'.repeat(40));
    console.log('URL: http://localhost:3000/api/insercao');
    console.log('Método: POST');
    console.log('Arquivo: frontend_simulation.csv');
    console.log('promotionName: "Pedro Barbeirooo"');

    // Fazer requisição para a API
    const response = await fetch('http://localhost:3000/api/insercao', {
      method: 'POST',
      body: formData,
      headers: {
        // Não incluindo Authorization para ver se é isso que está causando o problema
        ...formData.getHeaders()
      }
    });

    console.log('\n📥 RESPOSTA DA API:');
    console.log('-'.repeat(40));
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);

    const responseText = await response.text();
    console.log('Resposta:', responseText);

    // Tentar parsear como JSON
    try {
      const responseJson = JSON.parse(responseText);
      console.log('\n📋 RESPOSTA PARSEADA:');
      console.log(JSON.stringify(responseJson, null, 2));
    } catch (e) {
      console.log('\n⚠️ Resposta não é JSON válido');
    }

    // Limpar arquivo temporário
    fs.unlinkSync(csvPath);
    console.log('\n🧹 Arquivo temporário removido');

  } catch (error) {
    console.error('❌ Erro na simulação:', error.message);
    if (error.code) {
      console.error('Código do erro:', error.code);
    }
  }
}

simulateFrontendUpload();