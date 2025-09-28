@echo off
echo =====================================================
echo APLICANDO OTIMIZACOES DO BANCO DE DADOS POSTGRESQL
echo =====================================================
echo.

REM Verifica se o Docker esta rodando
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker nao encontrado. Certifique-se de que o Docker esta instalado e rodando.
    pause
    exit /b 1
)

REM Verifica se o container do PostgreSQL esta rodando
echo 🔍 Verificando se o container PostgreSQL esta rodando...
docker ps --filter "name=betpromo-postgres" --format "table {{.Names}}\t{{.Status}}" | findstr "betpromo-postgres" >nul
if %errorlevel% neq 0 (
    echo ❌ Container betpromo-postgres nao encontrado ou nao esta rodando.
    echo 💡 Execute: docker-compose up -d postgres
    pause
    exit /b 1
)

echo ✅ Container PostgreSQL encontrado e rodando.
echo.

REM Copia o script SQL para dentro do container
echo 📋 Copiando script de otimizacao para o container...
docker cp "%~dp0optimize_database.sql" betpromo-postgres:/tmp/optimize_database.sql
if %errorlevel% neq 0 (
    echo ❌ Erro ao copiar script para o container.
    pause
    exit /b 1
)

echo ✅ Script copiado com sucesso.
echo.

REM Executa o script de otimizacao
echo 🚀 Executando otimizacoes do banco de dados...
echo ⏳ Isso pode levar alguns minutos dependendo do tamanho dos dados...
echo.

docker exec -i betpromo-postgres psql -U betpromo_user -d betpromo -f /tmp/optimize_database.sql
if %errorlevel% neq 0 (
    echo ❌ Erro ao executar script de otimizacao.
    echo 💡 Verifique os logs do PostgreSQL para mais detalhes.
    pause
    exit /b 1
)

echo.
echo ✅ Otimizacoes aplicadas com sucesso!
echo.

REM Remove o script temporario do container
echo 🧹 Limpando arquivos temporarios...
docker exec betpromo-postgres rm -f /tmp/optimize_database.sql

echo.
echo =====================================================
echo OTIMIZACOES CONCLUIDAS COM SUCESSO!
echo =====================================================
echo.
echo 📊 Indices criados para melhorar performance
echo 🧹 VACUUM executado para otimizar espaco em disco  
echo 📈 Estatisticas atualizadas
echo 👁️ Views criadas para consultas frequentes
echo 🔧 Funcoes utilitarias criadas para monitoramento
echo.
echo 💡 Para monitorar performance, execute no PostgreSQL:
echo    SELECT * FROM get_table_sizes();
echo    SELECT * FROM get_unused_indexes();
echo    SELECT * FROM v_performance_tabelas;
echo.
echo 🔧 Para configuracoes permanentes de performance:
echo    1. Edite postgresql.conf com as configuracoes comentadas no script
echo    2. Reinicie o PostgreSQL
echo    3. Execute: SELECT pg_reload_conf();
echo.

pause