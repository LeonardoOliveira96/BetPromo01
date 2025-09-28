const axios = require('axios');

async function testLogin() {
  const API_URL = 'http://localhost:3000/api';
  
  console.log('Testando login através da API...\n');
  
  // Teste 1: Login com usuário teste@teste.com
  try {
    console.log('=== Teste 1: teste@teste.com ===');
    const response1 = await axios.post(`${API_URL}/auth/login`, {
      email: 'teste@teste.com',
      password: 'senha123'
    });
    
    console.log('Status:', response1.status);
    console.log('Resposta:', JSON.stringify(response1.data, null, 2));
    console.log('✅ Login bem-sucedido!\n');
    
  } catch (error) {
    console.log('❌ Erro no login:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Resposta:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Erro:', error.message);
    }
    console.log('');
  }
  
  // Teste 2: Login com usuário admin@teste.com
  try {
    console.log('=== Teste 2: admin@teste.com ===');
    const response2 = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@teste.com',
      password: 'senha123'
    });
    
    console.log('Status:', response2.status);
    console.log('Resposta:', JSON.stringify(response2.data, null, 2));
    console.log('✅ Login bem-sucedido!\n');
    
  } catch (error) {
    console.log('❌ Erro no login:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Resposta:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Erro:', error.message);
    }
    console.log('');
  }
  
  // Teste 3: Login com senha incorreta
  try {
    console.log('=== Teste 3: Senha incorreta ===');
    const response3 = await axios.post(`${API_URL}/auth/login`, {
      email: 'teste@teste.com',
      password: 'senhaerrada'
    });
    
    console.log('Status:', response3.status);
    console.log('Resposta:', JSON.stringify(response3.data, null, 2));
    
  } catch (error) {
    console.log('❌ Erro esperado (senha incorreta):');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Resposta:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Erro:', error.message);
    }
    console.log('');
  }
}

testLogin();