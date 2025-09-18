# BetPromo API

API GraphQL para gerenciamento de promoções de apostas esportivas, construída com Node.js, TypeScript, MongoDB e Apollo Server.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **TypeScript** - Tipagem estática
- **GraphQL** - API query language
- **Apollo Server** - Servidor GraphQL
- **MongoDB** - Banco de dados NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticação
- **Express** - Framework web

## 📋 Funcionalidades

### Autenticação
- Login/Registro de usuários
- Autenticação JWT
- Controle de permissões por role (admin, manager, user)

### Gestão de Promoções
- Criação, edição e exclusão de promoções
- Diferentes tipos de promoções (bônus de boas-vindas, depósito, apostas grátis, etc.)
- Condições personalizáveis (depósito mínimo, odds mínimas, esportes elegíveis)
- Sistema de recompensas flexível
- Controle de público-alvo

### Uso de Promoções
- Aplicação de promoções pelos usuários
- Validação automática de condições
- Aprovação/rejeição manual
- Histórico de uso

### Sistema de Agents
- Processamento assíncrono de tarefas
- Notificações automáticas
- Validação de uso de promoções
- Geração de relatórios
- Limpeza automática de dados

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd BetPromo/api
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 📝 Variáveis de Ambiente

```env
# Servidor
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/betpromo

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Email (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cache (opcional)
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🔗 Endpoints

### GraphQL Playground
- **URL**: `http://localhost:4000/graphql`
- **Descrição**: Interface para testar queries e mutations

### Health Check
- **URL**: `http://localhost:4000/health`
- **Método**: GET
- **Descrição**: Verifica status da API

## 📊 Esquema GraphQL

### Tipos Principais

#### User
```graphql
type User {
  id: ID!
  name: String!
  email: String!
  role: UserRole!
  isActive: Boolean!
  lastLogin: Date
  createdAt: Date!
  updatedAt: Date!
}
```

#### Promotion
```graphql
type Promotion {
  id: ID!
  title: String!
  description: String!
  type: PromotionType!
  startDate: Date!
  endDate: Date!
  isActive: Boolean!
  conditions: PromotionConditions!
  reward: PromotionReward!
  usageLimit: Int
  usageCount: Int!
  targetAudience: TargetAudience!
  priority: Int!
  createdBy: User!
  isValid: Boolean!
  hasUsageAvailable: Boolean!
  createdAt: Date!
  updatedAt: Date!
}
```

### Queries Principais

```graphql
# Usuários
query {
  me { id name email role }
  users(limit: 10) { id name email role }
}

# Promoções
query {
  promotions(isActive: true) { id title type startDate endDate }
  activePromotions { id title description reward { value currency } }
}

# Uso de promoções
query {
  promotionUsages(userId: "user-id") { id status rewardAmount }
}
```

### Mutations Principais

```graphql
# Autenticação
mutation {
  login(email: "user@example.com", password: "password") {
    token
    user { id name email role }
  }
}

# Criar promoção
mutation {
  createPromotion(input: {
    title: "Bônus de Boas-vindas"
    description: "100% até R$ 500"
    type: WELCOME_BONUS
    startDate: "2024-01-01"
    endDate: "2024-12-31"
    conditions: { minDeposit: 50, newUsersOnly: true }
    reward: { type: PERCENTAGE, value: 100, maxValue: 500, currency: "BRL" }
    targetAudience: { userRoles: [USER] }
  }) {
    id title isActive
  }
}
```

## 🤖 Sistema de Agents

O sistema de agents processa tarefas assíncronas automaticamente:

### Tipos de Tarefas
- **promotion_notification**: Envio de notificações sobre promoções
- **usage_validation**: Validação automática de uso de promoções
- **report_generation**: Geração de relatórios analíticos
- **cleanup**: Limpeza de dados antigos
- **analytics**: Processamento de métricas

### Agendamento
- Execução a cada minuto
- Priorização por urgência
- Retry automático em caso de falha
- Limpeza automática de tarefas antigas

## 🔒 Segurança

- Autenticação JWT obrigatória
- Rate limiting (100 requests/15min por IP)
- Validação de entrada com Mongoose
- Sanitização de dados
- Headers de segurança com Helmet
- CORS configurado

## 📈 Performance

- Índices otimizados no MongoDB
- Paginação em todas as listagens
- Cache de queries (quando Redis configurado)
- Compressão de respostas
- Lazy loading de relacionamentos

## 🧪 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor com hot reload
npm run build        # Compila TypeScript
npm run start        # Inicia servidor de produção

# Qualidade de código
npm run lint         # Executa ESLint
npm run lint:fix     # Corrige problemas do ESLint
npm run type-check   # Verifica tipos TypeScript

# Testes
npm run test         # Executa testes
npm run test:watch   # Executa testes em modo watch
npm run test:coverage # Executa testes com coverage
```

## 📁 Estrutura do Projeto

```
src/
├── agents/           # Sistema de processamento assíncrono
├── config/           # Configurações (database, etc.)
├── middleware/       # Middlewares (auth, etc.)
├── models/           # Modelos Mongoose
├── resolvers/        # Resolvers GraphQL
├── schema/           # Schema GraphQL
├── types/            # Tipos TypeScript
└── index.ts          # Arquivo principal
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.