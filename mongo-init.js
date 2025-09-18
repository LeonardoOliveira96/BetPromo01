// Script de inicialização do MongoDB
db = db.getSiblingDB('betpromo');

// Criar usuário para a aplicação
db.createUser({
  user: 'betpromo_user',
  pwd: 'betpromo_password',
  roles: [
    {
      role: 'readWrite',
      db: 'betpromo'
    }
  ]
});

// Criar coleções iniciais (opcional)
db.createCollection('users');
db.createCollection('bets');

print('Database betpromo initialized successfully!');