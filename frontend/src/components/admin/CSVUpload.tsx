import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UploadResult {
  success: boolean;
  message: string;
  data?: {
    totalRows: number;
    processedRows: number;
    newUsers: number;
    updatedUsers: number;
    errors: string[];
    processingTime: number;
    filename: string;
    promotionId: string;
  };
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export const CSVUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [promotionId, setPromotionId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addLog = (type: LogEntry['type'], message: string) => {
    const newLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        addLog('error', 'Arquivo deve ser do tipo CSV');
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo CSV válido",
          variant: "destructive"
        });
        return;
      }

      if (selectedFile.size > 100 * 1024 * 1024) { // 100MB
        addLog('error', 'Arquivo muito grande (máximo 100MB)');
        toast({
          title: "Erro",
          description: "Arquivo muito grande. Tamanho máximo: 100MB",
          variant: "destructive"
        });
        return;
      }

      setFile(selectedFile);
      addLog('info', `Arquivo selecionado: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const handleUpload = async () => {
    if (!file || !promotionId.trim()) {
      addLog('error', 'Arquivo e ID da promoção são obrigatórios');
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo e informe o ID da promoção",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setResult(null);

    addLog('info', `Iniciando upload do arquivo: ${file.name}`);
    addLog('info', `Promoção: ${promotionId}`);

    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('promotion_id', promotionId.trim());

    try {
      addLog('info', 'Enviando arquivo para o servidor...');

      // Usar fetch para enviar o arquivo
      const response = await fetch('http://localhost:4000/api/csv/upload-progress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Verificar se é SSE
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        // Processar SSE
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Não foi possível ler a resposta do servidor');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (data.type) {
                  case 'start':
                    addLog('info', data.message);
                    setUploadProgress(5);
                    break;

                  case 'progress': {
                    const percentage = Math.min(95, Math.max(5, data.percentage || 0));
                    setUploadProgress(percentage);

                    if (data.totalRows) {
                      addLog('info', `Progresso: ${data.processedRows?.toLocaleString() || 0}/${data.totalRows.toLocaleString()} linhas (${percentage.toFixed(1)}%)`);
                    }
                    break;
                  }

                  case 'complete':
                    setUploadProgress(100);
                    setResult(data);
                    addLog('success', 'Upload concluído com sucesso!');

                    if (data.data) {
                      addLog('info', `Total de linhas: ${data.data.totalRows.toLocaleString()}`);
                      addLog('info', `Linhas processadas: ${data.data.processedRows.toLocaleString()}`);
                      addLog('info', `Novos usuários: ${data.data.newUsers.toLocaleString()}`);
                      addLog('info', `Usuários atualizados: ${data.data.updatedUsers.toLocaleString()}`);
                      addLog('info', `Tempo de processamento: ${(data.data.processingTime / 1000).toFixed(2)}s`);

                      if (data.data.errors.length > 0) {
                        addLog('warning', `${data.data.errors.length} erros encontrados`);
                        data.data.errors.forEach((error, index) => {
                          if (index < 5) { // Mostrar apenas os primeiros 5 erros
                            addLog('error', error);
                          }
                        });
                        if (data.data.errors.length > 5) {
                          addLog('warning', `... e mais ${data.data.errors.length - 5} erros`);
                        }
                      }
                    }

                    toast({
                      title: "Sucesso!",
                      description: `Arquivo processado: ${data.data?.processedRows.toLocaleString()} linhas`,
                    });
                    break;

                  case 'error':
                    throw new Error(data.message || 'Erro no processamento');
                }
              } catch (parseError) {
                console.error('Erro ao parsear dados SSE:', parseError);
              }
            }
          }
        }
      } else {
        // Fallback para resposta JSON normal
        const data: UploadResult = await response.json();

        if (data.success) {
          setResult(data);
          setUploadProgress(100);
          addLog('success', 'Upload concluído com sucesso!');

          toast({
            title: "Sucesso!",
            description: `Arquivo processado: ${data.data?.processedRows.toLocaleString()} linhas`,
          });
        } else {
          throw new Error(data.message || 'Erro no upload');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog('error', `Falha no upload: ${errorMessage}`);

      setResult({
        success: false,
        message: errorMessage
      });

      toast({
        title: "Erro no Upload",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPromotionId('');
    setUploadProgress(0);
    setResult(null);
    setLogs([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    addLog('info', 'Formulário resetado');
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogTextColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-yellow-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Upload de CSV</h2>
        <p className="text-muted-foreground">
          Faça upload de arquivos CSV para adicionar usuários às promoções
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Arquivo
            </CardTitle>
            <CardDescription>
              Selecione um arquivo CSV e informe o ID da promoção
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="promotion-id">ID da Promoção</Label>
              <Input
                id="promotion-id"
                placeholder="Ex: promo_2024_09_27"
                value={promotionId}
                onChange={(e) => setPromotionId(e.target.value)}
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv-file">Arquivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Progresso do upload</span>
                  <span className="text-sm">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={!file || !promotionId.trim() || isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Fazer Upload
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={isUploading}
              >
                Limpar
              </Button>
            </div>

            {result && (
              <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                  {result.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Logs de Processamento
            </CardTitle>
            <CardDescription>
              Acompanhe o progresso e possíveis erros em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full">
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum log ainda. Selecione um arquivo para começar.
                </p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      {getLogIcon(log.type)}
                      <div className="flex-1">
                        <span className="text-muted-foreground">[{log.timestamp}]</span>
                        <span className={`ml-2 ${getLogTextColor(log.type)}`}>
                          {log.message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {logs.length > 0 && (
              <>
                <Separator className="my-4" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogs([])}
                  className="w-full"
                >
                  Limpar Logs
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resultados Detalhados */}
      {result?.success && result.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Resultados do Processamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {result.data.totalRows.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total de Linhas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {result.data.processedRows.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Processadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {result.data.newUsers.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Novos Usuários</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {result.data.updatedUsers.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Atualizados</div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Arquivo: {result.data.filename}</span>
              <span>Tempo: {(result.data.processingTime / 1000).toFixed(2)}s</span>
              <span>Promoção: {result.data.promotionId}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Formato do Arquivo CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              O arquivo CSV deve conter as seguintes colunas (na ordem exata):
            </p>
            <code className="block bg-muted p-2 rounded text-sm">
              smartico_user_id,user_ext_id,core_sm_brand_id,crm_brand_id,ext_brand_id,crm_brand_name
            </code>
            <p className="text-sm text-muted-foreground">
              Exemplo de linha:
            </p>
            <code className="block bg-muted p-2 rounded text-sm">
              65020111,177805,627,627,a7kbetbr,bet7k
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};