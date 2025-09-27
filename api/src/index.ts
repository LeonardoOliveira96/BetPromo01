import express from 'express';
import { createServer } from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/database';
import { initializeModels } from './models';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './resolvers';
import { createContext } from './middleware/auth';
import { initializeAgents } from './agents';
import csvRoutes from './routes/csvRoutes';
import searchRoutes from './routes/searchRoutes';

// Carrega variáveis de ambiente
dotenv.config();

async function startServer() {
  try {
    // Conecta ao banco de dados
    await connectDB();
    console.log('🚀 Conectado ao MongoDB');

    // Inicializa os modelos
    initializeModels();

    // Inicializa os agents
    await initializeAgents();

    // Cria o servidor Express
    const app = express();

    // Middlewares de segurança
    app.use(helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    }));

    // CORS
    app.use(cors({
      origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:8080'],
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // máximo 100 requests por IP
      message: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
    });
    app.use(limiter);

    // Middleware para parsing JSON
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Cria o servidor HTTP
    const httpServer = createServer(app);

    // Cria o servidor Apollo GraphQL
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
      formatError: (error: any) => {
        console.error('GraphQL Error:', error);
        return {
          message: error.message,
          code: error.extensions?.code,
          path: error.path,
        };
      },
    });

    await server.start();
    
    // Rotas REST para CSV
    app.use('/api/csv', csvRoutes);
    
    // Rotas REST para busca
    app.use('/api/search', searchRoutes);
    
    // Aplica o middleware do Apollo
    app.use('/graphql', cors<cors.CorsRequest>({
      origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:8080'],
      credentials: true,
    }), express.json(), expressMiddleware(server, {
      context: createContext,
    }));

    // Rota de health check
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        graphql: '/graphql',
      });
    });

    // Inicia o servidor
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📊 GraphQL disponível em http://localhost:${PORT}/graphql`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Recebido SIGTERM, encerrando servidor...');
      await disconnectDB();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('🛑 Recebido SIGINT, encerrando servidor...');
      await disconnectDB();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();