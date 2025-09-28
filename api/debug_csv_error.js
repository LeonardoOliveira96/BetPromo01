const fs = require('fs');
const path = require('path');

// Simular o método parseCustomCSVLine
function parseCustomCSVLine(line) {
  try {
    // Remove aspas externas se existirem
    let cleanLine = line.trim();
    if (cleanLine.startsWith('"') && cleanLine.endsWith('"')) {
      cleanLine = cleanLine.slice(1, -1);
    }
    
    // Substitui aspas duplas escapadas por aspas simples temporariamente
    cleanLine = cleanLine.replace(/""/g, '§QUOTE§');
    
    // Divide por vírgulas, mas mantém aspas
    const parts = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < cleanLine.length; i++) {
      const char = cleanLine[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      
      current += char;
    }
    
    if (current) {
      parts.push(current.trim());
    }
    
    // Remove aspas e restaura aspas duplas
    const cleanParts = parts.map(part => {
      let clean = part.trim();
      // Remove aspas externas
      if (clean.startsWith('"') && clean.endsWith('"')) {
        clean = clean.slice(1, -1);
      }
      // Restaura aspas duplas e remove aspas extras
      clean = clean.replace(/§QUOTE§/g, '"');
      return clean;
    });

    // Mapeia para objeto (assumindo estrutura padrão)
    return {
      smartico_user_id: cleanParts[0] || '',
      crm_brand_name: cleanParts[1] || '',
      ext_brand_id: cleanParts[2] || '',
      promocao_nome: cleanParts[3] || '',
      regras: cleanParts[4] || '',
      data_inicio: cleanParts[5] || '',
      data_fim: cleanParts[6] || ''
    };
  } catch (error) {
    console.error('Erro no parseCustomCSVLine:', error);
    throw error;
  }
}

async function debugCSVError() {
  console.log('🔍 DEBUGANDO ERRO NO PROCESSAMENTO DO CSV\n');
  
  try {
    // Verificar se existe algum arquivo CSV recente no diretório uploads
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Diretório uploads não encontrado');
      return;
    }
    
    const files = fs.readdirSync(uploadsDir)
      .filter(file => file.endsWith('.csv'))
      .map(file => ({
        name: file,
        path: path.join(uploadsDir, file),
        stats: fs.statSync(path.join(uploadsDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime); // Mais recente primeiro
    
    if (files.length === 0) {
      console.log('❌ Nenhum arquivo CSV encontrado no diretório uploads');
      return;
    }
    
    console.log(`📁 Arquivos CSV encontrados: ${files.length}`);
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name} (${file.stats.mtime.toLocaleString()})`);
    });
    
    // Usar o arquivo mais recente
    const latestFile = files[0];
    console.log(`\n🔍 Analisando arquivo: ${latestFile.name}`);
    
    const fileContent = fs.readFileSync(latestFile.path, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Total de linhas: ${lines.length}`);
    console.log(`📋 Cabeçalho: ${lines[0]}`);
    
    // Testar as primeiras 5 linhas de dados
    console.log('\n🧪 Testando parse das primeiras linhas:');
    
    for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      
      console.log(`\n--- Linha ${i} ---`);
      console.log(`Raw: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
      
      try {
        const parsed = parseCustomCSVLine(line);
        console.log('✅ Parse OK:', {
          smartico_user_id: parsed.smartico_user_id,
          crm_brand_name: parsed.crm_brand_name,
          promocao_nome: parsed.promocao_nome || 'VAZIO'
        });
      } catch (error) {
        console.log('❌ Erro no parse:', error.message);
      }
    }
    
    // Verificar se há linhas problemáticas
    console.log('\n🔍 Procurando por linhas problemáticas...');
    let errorCount = 0;
    
    for (let i = 1; i < Math.min(100, lines.length); i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      
      try {
        parseCustomCSVLine(line);
      } catch (error) {
        errorCount++;
        if (errorCount <= 3) { // Mostrar apenas os primeiros 3 erros
          console.log(`❌ Erro na linha ${i}: ${error.message}`);
          console.log(`   Linha: ${line.substring(0, 100)}...`);
        }
      }
    }
    
    if (errorCount === 0) {
      console.log('✅ Nenhum erro encontrado nas primeiras 100 linhas');
    } else {
      console.log(`⚠️  Total de erros encontrados: ${errorCount}`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante debug:', error);
  }
}

debugCSVError().catch(console.error);