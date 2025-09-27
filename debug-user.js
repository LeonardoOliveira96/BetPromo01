const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conectar ao MongoDB
mongoose.connect('mongodb://localhost:27017/betpromo')
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar:', err));

// Schema do usuário (simplificado)
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

async function debugUser() {
  try {
    // Buscar o usuário
    const user = await User.findOne({ email: 'teste123@example.com' });
    
    if (!user) {
      console.log('❌ Usuário não encontrado!');
      
      // Listar todos os usuários para debug
      const allUsers = await User.find({}, 'email name');
      console.log('Usuários existentes:', allUsers);
      
      return;
    }
    
    console.log('✅ Usuário encontrado:');
    console.log('- Email:', user.email);
    console.log('- Nome:', user.name);
    console.log('- Role:', user.role);
    console.log('- Ativo:', user.isActive);
    console.log('- Senha hash:', user.password);
    
    // Testar comparação de senha
    const testPasswords = ['senhateste123', 'teste123', '123456'];
    
    for (const testPassword of testPasswords) {
      const isValid = await user.comparePassword(testPassword);
      console.log(`- Senha '${testPassword}': ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugUser();