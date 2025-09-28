const bcrypt = require('bcrypt');

async function testPassword() {
  const password = 'senha123';
  const hash = '$2b$10$TWJ3iJoUhuIED85pzI3ES..4o3SV5IjpfFgPbN3vUimVksKAbFMvO';
  
  console.log('Testando verificação de senha...');
  console.log('Senha:', password);
  console.log('Hash:', hash);
  
  try {
    const isValid = await bcrypt.compare(password, hash);
    console.log('Resultado da verificação:', isValid);
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

testPassword();