const path = require('path');

// Simula o processamento do CSV
async function testCSVProcessing() {
  try {
    console.log('🧪 Iniciando teste de processamento do CSV...');
    
    // Importa o CSVService
    const { CSVService } = require('./dist/services/csvService');
    const csvService = new CSVService();
    
    const testFilePath = path.join(__dirname, 'test_csv.csv');
    const filename = 'test_csv.csv';
    
    console.log(`📁 Testando arquivo: ${testFilePath}`);
    
    // Processa o CSV
    const stats = await csvService.processarCSV(testFilePath, filename);
    
    console.log('✅ Teste concluído com sucesso:', stats);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    console.error('❌ Stack trace:', error.stack);
  }
}

testCSVProcessing();