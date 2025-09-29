# Scripts de Banco de Dados

## clear-database.js

Script para limpar todos os dados do banco de dados, preservando apenas a tabela de usuários administrativos.

### O que o script faz:

✅ **Preserva:**
- `admin_users` - Usuários administrativos (teste@teste admin, etc.)

🗑️ **Limpa:**
- `usuarios_final` - Dados dos usuários do sistema
- `promocoes` - Definições das promoções
- `usuario_promocao` - Vínculos entre usuários e promoções
- `usuario_promocao_historico` - Histórico de operações
- `staging_import` - Dados de importação temporários

### Como usar:

#### Modo interativo (com confirmação):
```bash
cd api
node scripts/clear-database.js
```

#### Modo automático (sem confirmação):
```bash
cd api
node scripts/clear-database.js --force
```

### Pré-requisitos:

1. Certifique-se de que o arquivo `.env` está configurado corretamente
2. O banco de dados PostgreSQL deve estar rodando
3. As dependências do projeto devem estar instaladas (`npm install`)

### Variáveis de ambiente necessárias:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=betpromo
DB_PASSWORD=postgres
DB_PORT=5432
```

### Segurança:

- O script solicita confirmação antes de executar (exceto com `--force`)
- Desabilita temporariamente as verificações de chave estrangeira
- Reseta as sequências (auto-increment) após a limpeza
- Preserva os usuários administrativos

### Exemplo de saída:

```
🚀 Iniciando limpeza do banco de dados...
✅ Tabela 'staging_import' limpa - 150 registros removidos
✅ Tabela 'usuario_promocao_historico' limpa - 1250 registros removidos
✅ Tabela 'usuario_promocao' limpa - 500 registros removidos
✅ Tabela 'usuarios_final' limpa - 1000 registros removidos
✅ Tabela 'promocoes' limpa - 25 registros removidos
🔄 Sequência 'promocoes_promocao_id_seq' resetada
🔄 Sequência 'staging_import_id_seq' resetada
🔄 Sequência 'usuario_promocao_historico_id_seq' resetada
👤 Usuários administrativos preservados: 1
✨ Limpeza do banco de dados concluída com sucesso!
```