# BetPromo - Sistema de Gerenciamento de Promoções

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)
![React](https://img.shields.io/badge/React-18+-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)

Sistema completo para gerenciamento de promoções e usuários, desenvolvido com Node.js, TypeScript, PostgreSQL e React.

## 📋 Índice

- [Características](#-características)
- [Arquitetura](#-arquitetura)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Desenvolvimento](#-desenvolvimento)
- [Produção](#-produção)
- [API Documentation](#-api-documentation)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Testes](#-testes)
- [Deployment](#-deployment)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

## 🚀 Características

### Backend (API)
- **Node.js + TypeScript** - Desenvolvimento type-safe
- **Express.js** - Framework web robusto
- **PostgreSQL** - Banco de dados relacional
- **JWT Authentication** - Autenticação segura
- **Bcrypt** - Hash de senhas
- **Zod** - Validação de dados
- **Swagger/OpenAPI** - Documentação automática
- **Multer** - Upload de arquivos
- **CSV Processing** - Processamento de arquivos CSV
- **Rate Limiting** - Proteção contra spam
- **Helmet** - Headers de segurança
- **CORS** - Configuração de CORS
- **Compression** - Compressão de respostas

### Frontend
- **React 18** - Interface de usuário moderna
- **TypeScript** - Desenvolvimento type-safe
- **Vite** - Build tool rápido
- **Tailwind CSS** - Estilização utilitária
- **React Router** - Roteamento SPA
- **Axios** - Cliente HTTP

### DevOps
- **Docker** - Containerização
- **Docker Compose** - Orquestração de containers
- **Multi-stage builds** - Otimização de imagens
- **Health checks** - Monitoramento de saúde
- **pgAdmin** - Interface de administração do banco

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   PostgreSQL    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   Database      │
│   Port: 80      │    │   Port: 3000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   pgAdmin       │
                       │   Port: 8080    │
                       └─────────────────┘
```

## 📋 Pré-requisitos

### Para desenvolvimento local:
- **Node.js** 18+ 
- **npm** ou **yarn**
- **PostgreSQL** 15+

### Para Docker:
- **Docker** 20+
- **Docker Compose** 2+

## 🛠️ Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/BetPromo01.git
cd BetPromo01
```

### 2. Configure as variáveis de ambiente
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### 3. Escolha o método de instalação

#### Opção A: Docker (Recomendado)
```bash
# Produção
docker-compose up -d

# Desenvolvimento
docker-compose -f docker-compose.dev.yml up -d
```

#### Opção B: Instalação Local
```bash
# Backend
cd api
npm install
npm run build

# Frontend
cd ../frontend
npm install
npm run build
```

## ⚙️ Configuração

### Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure as seguintes variáveis:

#### Essenciais
```env
# Database
POSTGRES_DB=betpromo
POSTGRES_USER=betpromo_user
POSTGRES_PASSWORD=sua_senha_segura

# JWT
JWT_SECRET=sua_chave_jwt_super_secreta_minimo_32_caracteres

# API
API_PORT=3000
FRONTEND_PORT=80
```

#### Opcionais
```env
# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=100

# Upload
UPLOAD_MAX_SIZE=10485760

# Development
DEBUG=betpromo:*
LOG_LEVEL=info
```

### Configuração do Banco de Dados

O banco de dados é inicializado automaticamente com o script `api/database/init.sql` que cria:
- Tabelas necessárias
- Índices para performance
- Usuário administrador padrão
- Dados de exemplo (opcional)

**Credenciais padrão do admin:**
- Email: `admin@betpromo.com`
- Senha: `admin123`

⚠️ **IMPORTANTE**: Altere essas credenciais em produção!

## 🔧 Desenvolvimento

### Iniciando o ambiente de desenvolvimento

#### Com Docker (Recomendado)
```bash
# Inicia todos os serviços em modo desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Visualizar logs
docker-compose -f docker-compose.dev.yml logs -f

# Parar serviços
docker-compose -f docker-compose.dev.yml down
```

#### Localmente
```bash
# Terminal 1 - Database
docker run -d \
  --name postgres-dev \
  -e POSTGRES_DB=betpromo \
  -e POSTGRES_USER=betpromo_user \
  -e POSTGRES_PASSWORD=betpromo_pass \
  -p 5432:5432 \
  -v $(pwd)/api/database/init.sql:/docker-entrypoint-initdb.d/init.sql \
  postgres:15-alpine

# Terminal 2 - Backend
cd api
npm run dev

# Terminal 3 - Frontend
cd frontend
npm run dev
```

### URLs de Desenvolvimento
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api-docs
- **pgAdmin**: http://localhost:8080

### Debug do Backend
```bash
# Com breakpoints
npm run dev:debug

# Conectar debugger na porta 9229
```

## 🚀 Produção

### Deploy com Docker

#### 1. Build das imagens
```bash
docker-compose build
```

#### 2. Iniciar em produção
```bash
docker-compose up -d
```

#### 3. Verificar saúde dos serviços
```bash
docker-compose ps
docker-compose logs
```

### Deploy Manual

#### 1. Build do Backend
```bash
cd api
npm ci --only=production
npm run build
```

#### 2. Build do Frontend
```bash
cd frontend
npm ci --only=production
npm run build
```

#### 3. Configurar servidor web (nginx)
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    
    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📚 API Documentation

A documentação completa da API está disponível via Swagger:

- **Desenvolvimento**: http://localhost:3000/api-docs
- **Produção**: https://seu-dominio.com/api-docs

### Principais Endpoints

#### Autenticação
```
POST /api/auth/login      # Login de usuário
GET  /api/auth/me         # Dados do usuário logado
POST /api/auth/logout     # Logout
```

#### Consultas
```
GET  /api/consulta        # Listar usuários e promoções
GET  /api/consulta/{id}   # Dados de usuário específico
GET  /api/consulta/{id}/historico # Histórico de promoções
```

#### Importação CSV
```
POST /api/insercao        # Upload de arquivo CSV
GET  /api/insercao/historico # Histórico de importações
GET  /api/insercao/template  # Download template CSV
```

### Autenticação

A API usa JWT Bearer tokens:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@betpromo.com","password":"admin123"}'

# Usar token
curl -X GET http://localhost:3000/api/consulta \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

## 📁 Estrutura do Projeto

```
BetPromo01/
├── api/                          # Backend Node.js
│   ├── src/
│   │   ├── config/              # Configurações
│   │   ├── controllers/         # Controladores
│   │   ├── middlewares/         # Middlewares
│   │   ├── routes/              # Rotas
│   │   ├── services/            # Serviços de negócio
│   │   ├── types/               # Tipos TypeScript
│   │   ├── utils/               # Utilitários
│   │   └── schemas/             # Schemas de validação
│   ├── database/                # Scripts SQL
│   ├── uploads/                 # Arquivos enviados
│   ├── Dockerfile               # Docker produção
│   ├── Dockerfile.dev           # Docker desenvolvimento
│   └── package.json
├── frontend/                     # Frontend React
│   ├── src/
│   │   ├── components/          # Componentes React
│   │   ├── pages/               # Páginas
│   │   ├── hooks/               # Custom hooks
│   │   ├── lib/                 # Bibliotecas
│   │   └── types/               # Tipos TypeScript
│   ├── public/                  # Arquivos estáticos
│   ├── Dockerfile               # Docker produção
│   ├── Dockerfile.dev           # Docker desenvolvimento
│   ├── nginx.conf               # Configuração nginx
│   └── package.json
├── docker-compose.yml           # Docker produção
├── docker-compose.dev.yml       # Docker desenvolvimento
├── .env.example                 # Exemplo de variáveis
└── README.md
```

## 📜 Scripts Disponíveis

### Backend (api/)
```bash
npm run dev          # Desenvolvimento com hot reload
npm run dev:debug    # Desenvolvimento com debugger
npm run build        # Build para produção
npm run start        # Iniciar produção
npm run test         # Executar testes
npm run test:watch   # Testes em modo watch
npm run lint         # Verificar código
npm run lint:fix     # Corrigir problemas de lint
npm run typecheck    # Verificar tipos TypeScript
```

### Frontend (frontend/)
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # Verificar código
npm run lint:fix     # Corrigir problemas de lint
npm run typecheck    # Verificar tipos TypeScript
```

### Docker
```bash
# Produção
docker-compose up -d              # Iniciar
docker-compose down               # Parar
docker-compose logs -f            # Ver logs
docker-compose ps                 # Status dos containers

# Desenvolvimento
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml logs -f
```

## 🧪 Testes

### Backend
```bash
cd api
npm run test                # Executar todos os testes
npm run test:watch          # Modo watch
npm run test:coverage       # Com coverage
```

### Frontend
```bash
cd frontend
npm run test                # Executar testes
npm run test:ui             # Interface gráfica
npm run test:coverage       # Com coverage
```

## 🚀 Deployment

### Ambiente de Produção

#### 1. Preparação do Servidor
```bash
# Instalar Docker e Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Deploy da Aplicação
```bash
# Clone do repositório
git clone https://github.com/seu-usuario/BetPromo01.git
cd BetPromo01

# Configurar variáveis de ambiente
cp .env.example .env
nano .env  # Editar com valores de produção

# Iniciar aplicação
docker-compose up -d

# Verificar status
docker-compose ps
```

#### 3. Configurar Proxy Reverso (nginx)
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 4. SSL com Let's Encrypt
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seu-dominio.com

# Renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Monitoramento

#### Health Checks
```bash
# API
curl http://localhost:3000/api/health

# Frontend
curl http://localhost:80/health

# Database
docker exec betpromo-postgres pg_isready -U betpromo_user
```

#### Logs
```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Backup do Banco de Dados

#### Backup
```bash
# Backup completo
docker exec betpromo-postgres pg_dump -U betpromo_user betpromo > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup com compressão
docker exec betpromo-postgres pg_dump -U betpromo_user betpromo | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

#### Restore
```bash
# Restore
docker exec -i betpromo-postgres psql -U betpromo_user betpromo < backup.sql

# Restore com compressão
gunzip -c backup.sql.gz | docker exec -i betpromo-postgres psql -U betpromo_user betpromo
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- **TypeScript**: Tipagem estrita
- **ESLint**: Linting automático
- **Prettier**: Formatação de código
- **Conventional Commits**: Padrão de commits
- **Testes**: Cobertura mínima de 80%

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

- **Email**: suporte@betpromo.com
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/BetPromo01/issues)
- **Documentação**: [Wiki](https://github.com/seu-usuario/BetPromo01/wiki)

---

**Desenvolvido com ❤️ pela equipe BetPromo**