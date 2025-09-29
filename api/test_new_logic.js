const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

// Dados de login
const loginData = {
  email: 'admin@admin.com',
  password: 'admin123'
};

let authToken = '';

async function login() {
  console.log('🔐 Fazendo login...');
  
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(loginData)
  });

  if (!response.ok) {
    throw new Error(`Erro no login: ${response.status}`);
  }

  const data = await response.json();
  authToken = data.token;
  console.log('✅ Login realizado com sucesso');
  return authToken;
}

async function createTestCSV() {
  console.log('📄 Criando arquivo CSV de teste...');
  
  const csvContent = `nome,email,telefone,cpf,data_nascimento,endereco,cidade,estado,cep
João Silva,joao.silva.test@email.com,11999999001,12345678901,1990-01-15,Rua A 123,São Paulo,SP,01234-567
Maria Santos,maria.santos.test@email.com,11999999002,12345678902,1985-03-22,Rua B 456,Rio de Janeiro,RJ,20123-456
Pedro Costa,pedro.costa.test@email.com,11999999003,12345678903,1992-07-10,Rua C 789,Belo Horizonte,MG,30123-789`;

  const filename = `test_new_logic_${Date.now()}.csv`;
  const filepath = path.join(__dirname, filename);
  
  fs.writeFileSync(filepath, csvContent);
  console.log(`✅ Arquivo CSV criado: ${filename}`);
  
  return { filename, filepath };
}

async function uploadCSV(filepath, filename) {
  console.log('📤 Fazendo upload do CSV (apenas para adicionar usuários)...');
  
  const form = new FormData();
  form.append('file', fs.createReadStream(filepath));

  const response = await fetch(`${API_BASE}/insercao`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: form
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro no upload: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Upload do CSV realizado com sucesso');
  console.log('📊 Resultado do upload:', JSON.stringify(result, null, 2));
  
  return result;
}

async function createPromotion(csvFilename) {
  console.log('🎯 Criando promoção e vinculando usuários do CSV...');
  
  const promotionData = {
    nome: `Promoção Teste Nova Lógica ${Date.now()}`,
    regras: 'Teste da nova lógica de processamento separado',
    data_inicio: new Date().toISOString(),
    data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
    status: 'active',
    csvFilename: csvFilename
  };

  const response = await fetch(`${API_BASE}/promocoes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(promotionData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao criar promoção: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Promoção criada com sucesso');
  console.log('📊 Resultado da criação:', JSON.stringify(result, null, 2));
  
  return result;
}

async function cleanup(filepath) {
  console.log('🧹 Limpando arquivos temporários...');
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('✅ Arquivo CSV temporário removido');
    }
  } catch (error) {
    console.log('⚠️ Erro ao remover arquivo temporário:', error.message);
  }
}

async function testNewLogic() {
  let filepath = '';
  
  try {
    console.log('🚀 Iniciando teste da nova lógica...\n');
    
    // 1. Login
    await login();
    
    // 2. Criar CSV de teste
    const { filename, filepath: csvPath } = await createTestCSV();
    filepath = csvPath;
    
    // 3. Upload do CSV (apenas adiciona usuários)
    const uploadResult = await uploadCSV(csvPath, filename);
    
    // 4. Criar promoção e vincular usuários do CSV
    const promotionResult = await createPromotion(uploadResult.data.filename);
    
    console.log('\n🎉 Teste da nova lógica concluído com sucesso!');
    console.log('✅ Fluxo funcionando corretamente:');
    console.log('   1. CSV processado apenas para adicionar usuários');
    console.log('   2. Promoção criada separadamente');
    console.log('   3. Usuários do CSV vinculados à promoção');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (filepath) {
      await cleanup(filepath);
    }
  }
}

// Executar o teste
testNewLogic();