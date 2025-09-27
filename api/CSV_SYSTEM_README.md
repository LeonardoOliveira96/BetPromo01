# Sistema de Processamento de CSV para Promoções

Este sistema permite o upload e processamento eficiente de arquivos CSV contendo dados de usuários para promoções de apostas.

## 🚀 Características Principais

- **Performance Otimizada**: Processa até 1 milhão de linhas em poucos minutos
- **Streaming**: Não sobrecarrega a memória, mesmo com arquivos grandes
- **Bulk Operations**: Usa operações em lote para máxima eficiência
- **Upsert Inteligente**: Não duplica usuários, apenas adiciona novas promoções
- **Índices Otimizados**: Consultas rápidas mesmo com milhões de registros
- **Transacional**: Garante consistência dos dados

## 📊 Estrutura de Dados

### Formato do CSV
```csv
smartico_user_id,user_ext_id,core_sm_brand_id,crm_brand_id,ext_brand_id,crm_brand_name
65020111,177805,627,627,a7kbetbr,bet7k
65020112,177806,627,627,a7kbetbr,bet7k
65020113,177807,628,628,pixbetbr,pixbet
```

### Documento MongoDB
```javascript
{
  smartico_user_id: 65020111,
  user_ext_id: "177805",
  core_sm_brand_id: 627,
  crm_brand_id: 627,
  ext_brand_id: "a7kbetbr",
  crm_brand_name: "bet7k",
  
  current_promotions: ["promo_2024_09_27", "promo_2024_10_01"],
  
  promotion_history: [
    {
      promotion_id: "promo_2024_09_27",
      filename: "setembro_users.csv",
      added_date: new Date("2024-09-27"),
      status: "active"
    }
  ],
  
  file_history: [
    {
      filename: "setembro_users.csv",
      uploaded_date: new Date("2024-09-27"),
      promotion_id: "promo_2024_09_27"
    }
  ],
  
  created_at: new Date(),
  updated_at: new Date()
}
```

## 🛠 Instalação e Configuração

### 1. Instalar Dependências
```bash
npm install multer csv-parser @types/multer
```

### 2. Criar Índices no MongoDB
```bash
npm run create-indexes
```

### 3. Configurar Variáveis de Ambiente
```env
MONGODB_URI=mongodb://localhost:27017/betpromo
NODE_ENV=development
```

## 📡 API Endpoints

### Upload de CSV
```http
POST /api/csv/upload
Content-Type: multipart/form-data

Form Data:
- csv_file: arquivo.csv
- promotion_id: "promo_2024_09_27"
```

**Resposta:**
```json
{
  "success": true,
  "message": "Arquivo processado com sucesso",
  "data": {
    "totalRows": 1000000,
    "processedRows": 999950,
    "newUsers": 800000,
    "updatedUsers": 199950,
    "errors": [],
    "processingTime": 45000,
    "filename": "setembro_users.csv",
    "promotionId": "promo_2024_09_27"
  }
}
```

### Buscar Usuários em Promoção
```http
GET /api/csv/promotion/promo_2024_09_27/users?page=1&limit=100
```

### Verificar Usuário Específico
```http
GET /api/csv/promotion/promo_2024_09_27/user/65020111
```

### Estatísticas da Promoção
```http
GET /api/csv/promotion/promo_2024_09_27/stats
```

### Remover Usuário da Promoção
```http
DELETE /api/csv/promotion/promo_2024_09_27/user/65020111
```

## 🔧 Uso Programático

### Processamento de CSV
```typescript
import { CSVProcessor } from './services/csvProcessor';

const processor = new CSVProcessor(1000); // Batch de 1000

const result = await processor.processCSV(
  '/path/to/file.csv',
  'setembro_users.csv',
  'promo_2024_09_27'
);

console.log(`Processadas ${result.processedRows} linhas em ${result.processingTime}ms`);
```

### Consultas Rápidas
```typescript
// Verificar se usuário está em promoção
const isInPromotion = await CSVProcessor.isUserInPromotion(65020111, 'promo_2024_09_27');

// Buscar usuários da promoção
const users = await CSVProcessor.findUsersInPromotion('promo_2024_09_27', 1, 100);

// Estatísticas da promoção
const stats = await CSVProcessor.getPromotionStats('promo_2024_09_27');
```

### Manipulação de Usuários
```typescript
import { PromotionUser } from './models/PromotionUser';

const user = await PromotionUser.findOne({ smartico_user_id: 65020111 });

// Adicionar promoção
user.addPromotion('nova_promo', 'arquivo.csv');
await user.save();

// Verificar participação
const isParticipating = user.isInPromotion('nova_promo');

// Remover promoção
user.removePromotion('promo_antiga');
await user.save();
```

## ⚡ Performance

### Benchmarks
- **1 milhão de linhas**: ~3-5 minutos
- **Batch size recomendado**: 1000 registros
- **Memória**: Uso constante independente do tamanho do arquivo
- **Throughput**: ~5000-8000 registros/segundo

### Otimizações Implementadas
- Streaming de arquivo para não carregar tudo na memória
- Bulk operations com transações para máxima velocidade
- Índices compostos para consultas rápidas
- Upsert otimizado para evitar duplicações
- Processamento em batches para controle de memória

## 🔍 Índices Criados

```javascript
// Índices principais
{ smartico_user_id: 1 } // Único
{ current_promotions: 1 }
{ 'promotion_history.promotion_id': 1 }

// Índices compostos
{ smartico_user_id: 1, current_promotions: 1 }
{ ext_brand_id: 1, crm_brand_id: 1 }
{ 'promotion_history.promotion_id': 1, 'promotion_history.status': 1 }

// Índice de texto para busca
{ crm_brand_name: 'text', ext_brand_id: 'text', user_ext_id: 'text' }
```

## 🧪 Testes

```bash
# Executar testes
npm test

# Testes específicos do CSV
npm test -- csvProcessor.test.ts
```

## 🚨 Tratamento de Erros

O sistema trata diversos tipos de erro:

- **Arquivo inválido**: Formato não CSV
- **Dados inválidos**: Campos obrigatórios ausentes
- **Erro de banco**: Falhas de conexão ou transação
- **Memória**: Controle automático de uso de memória
- **Timeout**: Configuração de timeouts para operações longas

## 📈 Monitoramento

### Logs Importantes
```
🔄 Iniciando processamento do arquivo: setembro_users.csv
📊 Promoção: promo_2024_09_27
✅ Processamento concluído: 999950/1000000 linhas
```

### Métricas Disponíveis
- Total de linhas processadas
- Novos usuários criados
- Usuários atualizados
- Tempo de processamento
- Lista de erros encontrados

## 🔒 Segurança

- Validação rigorosa de dados de entrada
- Sanitização de nomes de arquivo
- Limite de tamanho de arquivo (100MB)
- Remoção automática de arquivos temporários
- Transações para garantir consistência

## 🎯 Casos de Uso

1. **Upload Inicial**: Primeira importação de usuários para uma promoção
2. **Atualização**: Adicionar novos usuários a uma promoção existente
3. **Multi-promoção**: Mesmo usuário em várias promoções
4. **Consulta Rápida**: Verificar se usuário está elegível
5. **Relatórios**: Estatísticas e análises de promoções

## 🔧 Configurações Avançadas

### Tamanho do Batch
```typescript
const processor = new CSVProcessor(2000); // Batch maior para mais performance
```

### Timeout Personalizado
```typescript
// No arquivo de configuração do MongoDB
mongoose.connect(uri, {
  socketTimeoutMS: 60000, // 60 segundos para operações longas
});
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Consulte os exemplos em `src/examples/csvUsage.ts`
3. Execute os testes para validar o ambiente
4. Verifique a conectividade com o MongoDB