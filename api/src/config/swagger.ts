import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerUiOptions } from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BetPromo API',
      version: '1.0.0',
      description: `
        API para gerenciamento de promoções e usuários do sistema BetPromo.
        
        ## Funcionalidades
        - Autenticação JWT para administradores
        - Consulta de usuários e promoções com filtros avançados
        - Upload e processamento de arquivos CSV
        - Histórico de importações e operações
        
        ## Autenticação
        A maioria dos endpoints requer autenticação via JWT token.
        Use o endpoint /api/auth/login para obter um token de acesso.
        
        ## Paginação
        Endpoints de listagem suportam paginação via parâmetros:
        - \`page\`: Número da página (padrão: 1)
        - \`limit\`: Itens por página (padrão: 10, máximo: 100)
        
        ## Filtros
        Endpoints de consulta suportam filtros via query parameters:
        - \`brand\`: Filtrar por marca
        - \`promocao\`: Filtrar por nome da promoção
        - \`data_inicio\`: Filtrar por data de início
        - \`data_fim\`: Filtrar por data de fim
      `,
      contact: {
        name: 'Suporte BetPromo',
        email: 'suporte@betpromo.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desenvolvimento'
      },
      {
        url: 'https://api.betpromo.com',
        description: 'Servidor de Produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido através do endpoint /api/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Erro interno do servidor'
            },
            error: {
              type: 'string',
              example: 'INTERNAL_SERVER_ERROR'
            },
            details: {
              type: 'object',
              description: 'Detalhes adicionais do erro (apenas em desenvolvimento)'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Dados de entrada inválidos'
            },
            error: {
              type: 'string',
              example: 'VALIDATION_ERROR'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'email'
                  },
                  message: {
                    type: 'string',
                    example: 'Email é obrigatório'
                  }
                }
              }
            }
          }
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1
            },
            limit: {
              type: 'integer',
              example: 10
            },
            total: {
              type: 'integer',
              example: 150
            },
            totalPages: {
              type: 'integer',
              example: 15
            },
            hasNext: {
              type: 'boolean',
              example: true
            },
            hasPrev: {
              type: 'boolean',
              example: false
            }
          }
        },
        AdminUser: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@betpromo.com'
            },
            nome: {
              type: 'string',
              example: 'Administrador'
            },
            ativo: {
              type: 'boolean',
              example: true
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        UsuarioFinal: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            smartico_user_id: {
              type: 'integer',
              format: 'int64',
              example: 123456789
            },
            user_ext_id: {
              type: 'string',
              example: 'EXT123'
            },
            core_sm_brand_id: {
              type: 'integer',
              example: 1
            },
            crm_brand_id: {
              type: 'integer',
              example: 100
            },
            ext_brand_id: {
              type: 'string',
              example: 'BRAND001'
            },
            crm_brand_name: {
              type: 'string',
              example: 'BetBrand'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Promocao: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            nome: {
              type: 'string',
              example: 'Promoção de Boas-vindas'
            },
            regras: {
              type: 'string',
              example: 'Depósito mínimo de R$ 50'
            },
            data_inicio: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            data_fim: {
              type: 'string',
              format: 'date-time',
              example: '2024-12-31T23:59:59.000Z'
            },
            ativa: {
              type: 'boolean',
              example: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        UsuarioPromocao: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            usuario_id: {
              type: 'integer',
              example: 1
            },
            promocao_id: {
              type: 'integer',
              example: 1
            },
            data_vinculacao: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            ativa: {
              type: 'boolean',
              example: true
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Autenticação',
        description: 'Endpoints para autenticação e gerenciamento de sessão'
      },
      {
        name: 'Usuários',
        description: 'Endpoints para consulta de usuários e promoções'
      },
      {
        name: 'CSV Import',
        description: 'Endpoints para upload e processamento de arquivos CSV'
      },
      {
        name: 'Sistema',
        description: 'Endpoints para monitoramento e estatísticas do sistema'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);

export const swaggerUiOptions: SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .swagger-ui .scheme-container {
      background: #1f2937;
      border: 1px solid #374151;
    }
    .swagger-ui .info {
      margin: 20px 0;
    }
    .swagger-ui .info .title {
      color: #f9fafb;
      font-size: 2rem;
      font-weight: 700;
    }
    .swagger-ui .info .description {
      color: #d1d5db;
      font-size: 0.95rem;
      line-height: 1.6;
    }
    .swagger-ui .info .description h2 {
      color: #f3f4f6;
      font-size: 1.25rem;
      margin: 1.5rem 0 0.75rem 0;
    }
    .swagger-ui .info .description p {
      margin: 0.5rem 0;
    }
    .swagger-ui .info .description code {
      background: #374151;
      color: #fbbf24;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }
  `,
  customSiteTitle: 'BetPromo API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    requestInterceptor: (req: any) => {
      // Add custom headers or modify requests if needed
      return req;
    }
  }
};

export const swaggerUiOptionsWithDarkTheme: SwaggerUiOptions = {
  ...swaggerUiOptions,
  customCss: `
    ${swaggerUiOptions.customCss}
    
    /* Dark theme styles */
    .swagger-ui {
      background: #111827;
      color: #f9fafb;
    }
    
    .swagger-ui .wrapper {
      background: #111827;
    }
    
    .swagger-ui .opblock-tag {
      background: #1f2937;
      border: 1px solid #374151;
      color: #f9fafb;
    }
    
    .swagger-ui .opblock-tag:hover {
      background: #374151;
    }
    
    .swagger-ui .opblock {
      background: #1f2937;
      border: 1px solid #374151;
      margin: 0 0 15px 0;
    }
    
    .swagger-ui .opblock .opblock-summary {
      border-bottom: 1px solid #374151;
    }
    
    .swagger-ui .opblock .opblock-summary-method {
      background: #374151;
      color: #f9fafb;
      text-shadow: none;
    }
    
    .swagger-ui .opblock .opblock-summary-path {
      color: #d1d5db;
    }
    
    .swagger-ui .opblock .opblock-summary-description {
      color: #9ca3af;
    }
    
    .swagger-ui .opblock.opblock-post {
      border-color: #059669;
      background: rgba(5, 150, 105, 0.1);
    }
    
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: #059669;
    }
    
    .swagger-ui .opblock.opblock-get {
      border-color: #2563eb;
      background: rgba(37, 99, 235, 0.1);
    }
    
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: #2563eb;
    }
    
    .swagger-ui .opblock.opblock-put {
      border-color: #d97706;
      background: rgba(217, 119, 6, 0.1);
    }
    
    .swagger-ui .opblock.opblock-put .opblock-summary-method {
      background: #d97706;
    }
    
    .swagger-ui .opblock.opblock-delete {
      border-color: #dc2626;
      background: rgba(220, 38, 38, 0.1);
    }
    
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background: #dc2626;
    }
    
    .swagger-ui .btn {
      background: #374151;
      color: #f9fafb;
      border: 1px solid #4b5563;
    }
    
    .swagger-ui .btn:hover {
      background: #4b5563;
    }
    
    .swagger-ui .btn.authorize {
      background: #059669;
      border-color: #059669;
    }
    
    .swagger-ui .btn.authorize:hover {
      background: #047857;
    }
    
    .swagger-ui .parameters-col_description input[type=text] {
      background: #374151;
      color: #f9fafb;
      border: 1px solid #4b5563;
    }
    
    .swagger-ui .parameters-col_description select {
      background: #374151;
      color: #f9fafb;
      border: 1px solid #4b5563;
    }
    
    .swagger-ui .response-col_status {
      color: #f9fafb;
    }
    
    .swagger-ui .response-col_description {
      color: #d1d5db;
    }
    
    .swagger-ui .model {
      background: #1f2937;
      border: 1px solid #374151;
    }
    
    .swagger-ui .model-title {
      color: #f9fafb;
    }
    
    .swagger-ui .prop-type {
      color: #fbbf24;
    }
    
    .swagger-ui .prop-format {
      color: #a78bfa;
    }
    
    .swagger-ui table thead tr th {
      background: #374151;
      color: #f9fafb;
      border-bottom: 1px solid #4b5563;
    }
    
    .swagger-ui table tbody tr td {
      background: #1f2937;
      color: #d1d5db;
      border-bottom: 1px solid #374151;
    }
    
    .swagger-ui .highlight-code {
      background: #1f2937;
    }
    
    .swagger-ui .microlight {
      color: #d1d5db;
    }
    
    .swagger-ui .auth-container {
      background: #1f2937;
      border: 1px solid #374151;
    }
    
    .swagger-ui .dialog-ux {
      background: #1f2937;
      border: 1px solid #374151;
    }
    
    .swagger-ui .modal-ux {
      background: rgba(17, 24, 39, 0.8);
    }
    
    .swagger-ui .modal-ux-content {
      background: #1f2937;
      border: 1px solid #374151;
    }
    
    .swagger-ui .close-modal {
      background: transparent;
      color: #f9fafb;
    }
    
    .swagger-ui .errors-wrapper {
      background: rgba(220, 38, 38, 0.1);
      border: 1px solid #dc2626;
      color: #fca5a5;
    }
    
    .swagger-ui .markdown p {
      color: #d1d5db;
    }
    
    .swagger-ui .markdown h1,
    .swagger-ui .markdown h2,
    .swagger-ui .markdown h3,
    .swagger-ui .markdown h4,
    .swagger-ui .markdown h5 {
      color: #f9fafb;
    }
    
    .swagger-ui .markdown code {
      background: #374151;
      color: #fbbf24;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
    }
    
    .swagger-ui .markdown pre {
      background: #1f2937;
      border: 1px solid #374151;
    }
    
    .swagger-ui .copy-to-clipboard {
      background: #374151;
      color: #f9fafb;
    }
    
    .swagger-ui .copy-to-clipboard:hover {
      background: #4b5563;
    }
  `
};