import bcrypt from 'bcryptjs';

async function generatePasswordHash() {
  const password = 'senha123';
  const saltRounds = 12;
  
  try {
    console.log('🔐 Gerando hash para a senha:', password);
    
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('\n✅ Hash gerado:');
    console.log(hash);
    
    // Verificar se o hash está correto
    const isValid = await bcrypt.compare(password, hash);
    console.log('\n🔍 Verificação do hash:', isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
    
    console.log('\n📋 Comando para inserir no MongoDB:');
    console.log(`db.users.updateOne(`);
    console.log(`  {email: "teste123@example.com"},`);
    console.log(`  {$set: {password: "${hash}"}}`);
    console.log(`)`);
    
  } catch (error) {
    console.error('❌ Erro ao gerar hash:', error);
  }
}

generatePasswordHash();