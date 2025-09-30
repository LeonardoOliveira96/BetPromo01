import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Save, Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2, Clock, Calendar as CalendarLucide } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { TokenStorage } from '@/lib/tokenStorage';

interface CreatePromotionFormProps {
  onSuccess: () => void;
}

interface UploadResult {
  success: boolean;
  message: string;
  data?: {
    totalRows: number;
    processedRows: number;
    newUsers: number;
    errors: string[];
    filename: string;
    userIds?: string[];
  };
}

interface LogEntry {
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export const CreatePromotionForm = ({ onSuccess }: CreatePromotionFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    brand: '',
    type: '',
    rules: '',
    targetAudience: 'all',
    targetClientIds: '',
    status: true,
    scheduleActivation: false,
    notifications: {
      sms: false,
      email: false,
      popup: false,
      push: false,
      whatsapp: false,
      telegram: false
    }
  });
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('23:59');

  // CSV Upload states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [csvUserIds, setCsvUserIds] = useState<string[]>([]);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addLog = (type: LogEntry['type'], message: string) => {
    const newLog: LogEntry = {
      timestamp: new Date(),
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

      setCsvFile(selectedFile);
      addLog('info', `Arquivo selecionado: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      addLog('error', 'Arquivo é obrigatório');
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo CSV",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    addLog('info', `Processando arquivo: ${csvFile.name}`);

    const uploadFormData = new FormData();
    uploadFormData.append('file', csvFile);

    // Log do FormData completo
    console.log('📤 FRONTEND - FormData sendo enviado:');
    for (const [key, value] of uploadFormData.entries()) {
      console.log(`   ${key}:`, value);
    }

    try {
      addLog('info', 'Enviando arquivo para o servidor...');
      setUploadProgress(10);

      console.log('🚀 FRONTEND - Enviando requisição para API...');

      const response = await fetch('http://localhost:3000/api/insercao', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TokenStorage.getToken()}`
        },
        body: uploadFormData,
      });

      console.log('📥 FRONTEND - Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      setUploadProgress(50);
      addLog('info', 'Processando arquivo no servidor...');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data: UploadResult = await response.json();
      console.log('📊 FRONTEND - Dados da resposta:', JSON.stringify(data, null, 2));

      setUploadProgress(100);

      if (data.success) {
        setUploadResult(data);
        addLog('success', 'Arquivo processado com sucesso!');
        console.log('✅ FRONTEND - Upload bem-sucedido:', data.data);

        if (data.data) {
          addLog('info', `Total de linhas: ${data.data.totalRows.toLocaleString()}`);
          addLog('info', `Linhas processadas: ${data.data.processedRows.toLocaleString()}`);

          // Extrair IDs dos usuários para associar à promoção
          if (data.data.userIds && data.data.userIds.length > 0) {
            setCsvUserIds(data.data.userIds);
            setFormData(prev => ({
              ...prev,
              targetAudience: 'specific',
              targetClientIds: data.data.userIds?.join(', ') || ''
            }));
            addLog('success', `${data.data.userIds.length} IDs de usuários carregados automaticamente`);
          }

          if (data.data.errors && data.data.errors.length > 0) {
            addLog('warning', `${data.data.errors.length} erros encontrados`);
            data.data.errors.forEach((error, index) => {
              if (index < 3) {
                addLog('error', error);
              }
            });
            if (data.data.errors.length > 3) {
              addLog('warning', `... e mais ${data.data.errors.length - 3} erros`);
            }
          }
        }

        toast({
          title: "Sucesso!",
          description: `Arquivo processado: ${data.data?.processedRows.toLocaleString()} linhas`,
        });
      } else {
        throw new Error(data.message || 'Erro no processamento');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog('error', `Falha no processamento: ${errorMessage}`);

      setUploadResult({
        success: false,
        message: errorMessage
      });

      toast({
        title: "Erro no Processamento",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevenir submissões múltiplas
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    if (!dateRange.from || !dateRange.to) {
      toast({
        title: "Datas obrigatórias",
        description: "Selecione as datas de início e fim da promoção",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Validar se CSV foi processado quando necessário
    if (formData.targetAudience === 'specific' && csvUserIds.length === 0 && !formData.targetClientIds.trim()) {
      toast({
        title: "Público-alvo não definido",
        description: "Para clientes específicos, você deve processar um CSV ou inserir IDs manualmente",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Criar objetos Date completos com horários
    console.log('🗓️ Datas selecionadas pelo usuário:');
    console.log('  - Data início selecionada:', dateRange.from);
    console.log('  - Data início toString:', dateRange.from?.toString());
    console.log('  - Data início toLocaleDateString:', dateRange.from?.toLocaleDateString('pt-BR'));
    console.log('  - Data fim selecionada:', dateRange.to);
    console.log('  - Data fim toString:', dateRange.to?.toString());
    console.log('  - Data fim toLocaleDateString:', dateRange.to?.toLocaleDateString('pt-BR'));
    console.log('  - Horário início:', startTime);
    console.log('  - Horário fim:', endTime);

    const startDateTime = new Date(dateRange.from);
    console.log('🔍 Processando data início:');
    console.log('  - new Date(dateRange.from):', startDateTime);
    console.log('  - Ano:', startDateTime.getFullYear());
    console.log('  - Mês:', startDateTime.getMonth() + 1);
    console.log('  - Dia:', startDateTime.getDate());
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    // Usar setUTCHours para evitar problemas de timezone
    startDateTime.setUTCHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(dateRange.to);
    console.log('🔍 Processando data fim:');
    console.log('  - new Date(dateRange.to):', endDateTime);
    console.log('  - Ano:', endDateTime.getFullYear());
    console.log('  - Mês:', endDateTime.getMonth() + 1);
    console.log('  - Dia:', endDateTime.getDate());
    
    const [endHour, endMinute] = endTime.split(':').map(Number);
    // Usar setUTCHours para evitar problemas de timezone
    endDateTime.setUTCHours(endHour, endMinute, 59, 999);

    console.log('📅 Datas processadas finais (UTC):');
    console.log('  - Data/hora início:', startDateTime);
    console.log('  - Data/hora início ISO:', startDateTime.toISOString());
    console.log('  - Data/hora fim:', endDateTime);
    console.log('  - Data/hora fim ISO:', endDateTime.toISOString());
    console.log('  - ⚠️ CORREÇÃO: Usando setUTCHours para evitar problemas de timezone');

    if (endDateTime <= startDateTime) {
      toast({
        title: "Data/Hora inválida",
        description: "A data/hora de fim deve ser posterior à data/hora de início",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const now = new Date();
    const isScheduled = startDateTime > now;

    // Determinar status baseado no agendamento
    let promotionStatus = formData.status;
    if (isScheduled && formData.scheduleActivation) {
      promotionStatus = false; // Inativa até o horário agendado
      addLog('info', `Promoção agendada para ativação em ${format(startDateTime, "PPP 'às' HH:mm", { locale: ptBR })}`);
    }

    console.log('📋 FRONTEND - Dados da promoção sendo enviados:');
    console.log('  - Nome:', formData.name);
    console.log('  - Descrição:', formData.description);
    console.log('  - Marca:', formData.brand);
    console.log('  - Tipo:', formData.type);
    console.log('  - Regras:', formData.rules);
    console.log('  - Data início ISO:', startDateTime.toISOString());
    console.log('  - Data fim ISO:', endDateTime.toISOString());
    console.log('  - Status calculado:', isScheduled && formData.scheduleActivation ? 'scheduled' : (formData.status ? 'active' : 'inactive'));
    console.log('  - IDs de usuários CSV:', csvUserIds);
    console.log('  - Agendamento ativo:', formData.scheduleActivation);
    console.log('  - Arquivo CSV:', uploadResult?.data?.filename);
    console.log('  - Notificações:', formData.notifications);

    const promotionData = {
      nome: formData.name,
      descricao: formData.description,
      marca: formData.brand,
      tipo: formData.type,
      regras: formData.rules || undefined,
      data_inicio: startDateTime.toISOString(),
      data_fim: endDateTime.toISOString(),
      status: isScheduled && formData.scheduleActivation ? 'scheduled' : (formData.status ? 'active' : 'inactive'),
      targetUserIds: csvUserIds.length > 0 ? csvUserIds : undefined,
      scheduleActivation: formData.scheduleActivation,
      csvFilename: uploadResult?.data?.filename || undefined,
      notifications: formData.notifications
    };

    console.log('🚀 FRONTEND - Enviando requisição para API:');
    console.log('  - URL: /api/promocoes');
    console.log('  - Método: POST');
    console.log('  - Dados completos:', JSON.stringify(promotionData, null, 2));

    try {
      // Criar promoção via API
      const response = await fetch('/api/promocoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TokenStorage.getToken()}`
        },
        body: JSON.stringify(promotionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar promoção');
      }

      const result = await response.json();

      addLog('success', `Promoção "${formData.name}" criada com sucesso (ID: ${result.data.promocao_id})`);

      if (csvUserIds.length > 0) {
        addLog('info', `${csvUserIds.length} usuários associados automaticamente`);
      }

      toast({
        title: "Promoção criada",
        description: `A promoção "${formData.name}" foi criada com sucesso${isScheduled && formData.scheduleActivation ? ' e agendada' : ''}`,
      });
    } catch (error) {
      console.error('Erro ao criar promoção:', error);
      addLog('error', `Erro ao criar promoção: ${error.message}`);

      toast({
        title: "Erro",
        description: error.message || "Erro ao criar promoção",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Reset form
    setFormData({
      name: '',
      description: '',
      brand: '',
      type: '',
      rules: '',
      targetAudience: 'all',
      targetClientIds: '',
      status: true,
      scheduleActivation: false,
      notifications: {
        sms: false,
        email: false,
        popup: false,
        push: false,
        whatsapp: false,
        telegram: false
      }
    });
    setDateRange({ from: undefined, to: undefined });
    setStartTime('09:00');
    setEndTime('23:59');
    setCsvFile(null);
    setCsvUserIds([]);
    setUploadResult(null);
    setLogs([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setIsSubmitting(false);
    onSuccess();
  };

  return (
    <div className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Criar Nova Promoção
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Siga os passos: 1) Upload do CSV para adicionar usuários (opcional), 2) Dados da promoção, 3) Criar promoção e vincular usuários
          </p>
        </CardHeader>
        <CardContent>
          {/* Passo 1: Upload de CSV */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <h3 className="text-lg font-semibold">Upload de Usuários (Opcional)</h3>
              {uploadResult?.success && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload de Arquivo */}
              <Card className="border-dashed border-2 border-gray-300 hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <h4 className="mt-2 text-lg font-medium">Upload CSV</h4>
                      <p className="text-sm text-muted-foreground">
                        Carregue um arquivo CSV para adicionar novos usuários ao sistema
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        disabled={isUploading}
                        className="cursor-pointer"
                      />

                      {csvFile && (
                        <div className="p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                          <p className="text-sm font-medium text-blue-300">
                            📄 {csvFile.name}
                          </p>
                          <p className="text-xs text-blue-400">
                            {(csvFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      )}

                      {isUploading && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Processando...</span>
                            <span className="text-sm">{Math.round(uploadProgress)}%</span>
                          </div>
                          <Progress value={uploadProgress} />
                        </div>
                      )}

                      <Button
                        type="button"
                        onClick={handleCsvUpload}
                        disabled={!csvFile || isUploading}
                        className="w-full"
                        variant={uploadResult?.success ? "default" : "outline"}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processando...
                          </>
                        ) : uploadResult?.success ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Processado com Sucesso
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Processar CSV
                          </>
                        )}
                      </Button>

                      {uploadResult && (
                        <Alert className={uploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                          <AlertDescription className={uploadResult.success ? "text-green-800" : "text-red-800"}>
                            {uploadResult.message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logs de Processamento */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Logs de Processamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] w-full">
                    {logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <FileText className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-muted-foreground text-sm">
                          Nenhum log ainda.<br />Selecione um arquivo para começar.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {logs.map((log, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                            {getLogIcon(log.type)}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${getLogTextColor(log.type)}`}>
                                {log.message}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(log.timestamp, 'HH:mm:ss')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {uploadResult?.success && uploadResult.data && (
              <Card className="mt-4 border-green-600/30 bg-green-900/20">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-300">
                        {uploadResult.data.totalRows?.toLocaleString() || 0}
                      </p>
                      <p className="text-sm text-green-400">Total de Linhas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-300">
                        {uploadResult.data.processedRows?.toLocaleString() || 0}
                      </p>
                      <p className="text-sm text-green-400">Processadas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-300">
                        {uploadResult.data.newUsers?.toLocaleString() || 0}
                      </p>
                      <p className="text-sm text-green-400">Novos Usuários</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-300">
                        {csvUserIds.length.toLocaleString()}
                      </p>
                      <p className="text-sm text-green-400">IDs Carregados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Passo 2: Dados da Promoção */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <h3 className="text-lg font-semibold">Dados da Promoção</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Promoção *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Bônus de Depósito 100%"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Marca *</Label>
                <Select value={formData.brand} onValueChange={(value) => setFormData({ ...formData, brand: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7k">7k</SelectItem>
                    <SelectItem value="cassino">cassino</SelectItem>
                    <SelectItem value="verabet">verabet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Descreva os benefícios da promoção..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>



            <div className="space-y-2">
              <Label>Tipo de Promoção *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apostas_gratis">Apostas gratis</SelectItem>
                  <SelectItem value="rodadas_gratis">Rodadas Gratis</SelectItem>
                  <SelectItem value="apostas_esportivas">Apostas Esportivas</SelectItem>
                  <SelectItem value="cassino_ao_vivo">Cassino ao vivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rules">Regras e Condições *</Label>
              <Textarea
                id="rules"
                placeholder="Ex: Depósito mínimo de R$ 50. Rollover 5x..."
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                required
              />
            </div>

            {/* Seção de Período da Promoção */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CalendarLucide className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Período da Promoção</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendário para seleção de intervalo de dias */}
                <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-muted/30 hover:bg-muted/40 backdrop-blur-sm">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <CalendarLucide className="h-4 w-4" />
                    Período da Promoção *
                  </h4>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Selecione o período (arraste do dia inicial ao final)
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11 border-primary/30 hover:border-primary/50 hover:bg-muted/50",
                            (!dateRange.from && !dateRange.to) && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                          {dateRange.from ? (
                            dateRange.to ? (
                              `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
                            ) : (
                              format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                            )
                          ) : (
                            "Selecionar período"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={(range) => setDateRange(range as { from: Date | undefined; to: Date | undefined })}
                          initialFocus
                          locale={ptBR}
                          className="pointer-events-auto"
                          classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center",
                            caption_label: "text-sm font-medium",
                            nav: "space-x-1 flex items-center absolute top-0 right-0",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
                            row: "flex w-full mt-2",
                            cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/30 hover:text-primary-foreground transition-colors duration-200",
                            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-lg shadow-primary/50",
                            day_today: "bg-accent text-accent-foreground border-2 border-primary/50",
                            day_outside: "text-muted-foreground opacity-50",
                            day_disabled: "text-muted-foreground opacity-50",
                            day_range_middle: "bg-primary/30 text-foreground hover:bg-primary/40 transition-colors duration-200",
                            day_range_start: "bg-primary text-primary-foreground shadow-lg shadow-primary/50",
                            day_range_end: "bg-primary text-primary-foreground shadow-lg shadow-primary/50",
                            day_hidden: "invisible",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {dateRange.from && dateRange.to && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Período selecionado: {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} até {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Horários */}
                <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-muted/30 hover:bg-muted/40 backdrop-blur-sm">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horários de Funcionamento
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-400" />
                        Hora Início *
                      </Label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full h-11 border-primary/30 hover:border-primary/50 focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-red-400" />
                        Hora Fim *
                      </Label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full h-11 border-primary/30 hover:border-primary/50 focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumo do período e horários selecionados */}
              {dateRange.from && dateRange.to && startTime && endTime && (
                <div className="p-4 border rounded-lg bg-blue-900/20 border-blue-600/30">
                  <div className="flex items-center space-x-3">
                    <div className="space-y-1">
                      <Label className="text-blue-300 font-medium">
                        Resumo do Período da Promoção
                      </Label>
                      <p className="text-sm text-blue-400">
                        A promoção funcionará de {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} até {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })} das {startTime} às {endTime}
                      </p>
                      <p className="text-xs text-blue-400">
                        Duração: {Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} dia(s)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Público-Alvo</h3>
              </div>

              <RadioGroup
                value={formData.targetAudience}
                onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-medium">Todos os clientes</div>
                      <div className="text-sm text-muted-foreground">A promoção será aplicada a todos os usuários</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="specific" id="specific" />
                  <Label htmlFor="specific" className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-medium">Clientes específicos</div>
                      <div className="text-sm text-muted-foreground">Selecionar usuários específicos por ID</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {formData.targetAudience === 'specific' && (
                <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="targetIds" className="font-medium">IDs dos Clientes</Label>
                    {csvUserIds.length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        {csvUserIds.length} IDs do CSV
                      </div>
                    )}
                  </div>
                  <Textarea
                    id="targetIds"
                    placeholder={csvUserIds.length > 0 ? "IDs carregados automaticamente do CSV" : "CLI001, CLI002, CLI003..."}
                    value={formData.targetClientIds}
                    onChange={(e) => setFormData({ ...formData, targetClientIds: e.target.value })}
                    className="min-h-[100px]"
                    readOnly={csvUserIds.length > 0}
                  />
                  {csvUserIds.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>IDs foram carregados automaticamente do arquivo CSV. Para editar, processe um novo arquivo.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Status da Promoção</h3>
              </div>

              <div className="flex items-center justify-between p-4 border border-primary/20 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
                <div className="flex-1">
                  <Label htmlFor="status" className="font-medium cursor-pointer text-foreground">
                    Status da Promoção
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.status
                      ? 'A promoção estará ativa imediatamente após criação'
                      : 'A promoção será criada como inativa'
                    }
                  </p>
                </div>
                <Switch
                  id="status"
                  checked={formData.status}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                />
              </div>
            </div>

            {/* Seção de Notificações */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Canais de Notificação</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione os canais onde a promoção será enviada/notificada aos usuários
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id="sms"
                    checked={formData.notifications.sms}
                    onCheckedChange={(checked) => 
                      setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, sms: checked as boolean }
                      })
                    }
                  />
                  <Label htmlFor="sms" className="cursor-pointer font-medium">SMS</Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id="email"
                    checked={formData.notifications.email}
                    onCheckedChange={(checked) => 
                      setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, email: checked as boolean }
                      })
                    }
                  />
                  <Label htmlFor="email" className="cursor-pointer font-medium">EMAIL</Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id="popup"
                    checked={formData.notifications.popup}
                    onCheckedChange={(checked) => 
                      setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, popup: checked as boolean }
                      })
                    }
                  />
                  <Label htmlFor="popup" className="cursor-pointer font-medium">POP UP</Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id="push"
                    checked={formData.notifications.push}
                    onCheckedChange={(checked) => 
                      setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, push: checked as boolean }
                      })
                    }
                  />
                  <Label htmlFor="push" className="cursor-pointer font-medium">PUSH</Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id="whatsapp"
                    checked={formData.notifications.whatsapp}
                    onCheckedChange={(checked) => 
                      setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, whatsapp: checked as boolean }
                      })
                    }
                  />
                  <Label htmlFor="whatsapp" className="cursor-pointer font-medium">WhatsApp</Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id="telegram"
                    checked={formData.notifications.telegram}
                    onCheckedChange={(checked) => 
                      setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, telegram: checked as boolean }
                      })
                    }
                  />
                  <Label htmlFor="telegram" className="cursor-pointer font-medium">Telegram</Label>
                </div>
              </div>
            </div>

            {/* Passo 3: Criar Promoção */}
            <div className="pt-6 border-t">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  3
                </div>
                <h3 className="text-lg font-semibold">Criar Promoção</h3>
              </div>

              <div className="space-y-4">
                {/* Resumo da promoção */}
                <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 shadow-lg">
                  <CardContent className="p-6">
                    <h4 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Resumo da Promoção
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                        <span className="text-muted-foreground font-medium">Nome:</span>
                        <span className="font-semibold text-foreground">{formData.name || 'Não informado'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                        <span className="text-muted-foreground font-medium">Marca:</span>
                        <span className="font-semibold text-foreground">{formData.brand || 'Não informado'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                        <span className="text-muted-foreground font-medium">Tipo:</span>
                        <span className="font-semibold text-foreground">
                          {formData.type === 'apostas_gratis' ? 'Apostas gratis' :
                           formData.type === 'rodadas_gratis' ? 'Rodadas Gratis' :
                           formData.type === 'apostas_esportivas' ? 'Apostas Esportivas' :
                           formData.type === 'cassino_ao_vivo' ? 'Cassino ao vivo' :
                           formData.type || 'Não informado'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                        <span className="text-muted-foreground font-medium">Status:</span>
                        <span className={`font-semibold px-2 py-1 rounded-full text-xs ${formData.status ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {formData.status ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                        <span className="text-muted-foreground font-medium">Público:</span>
                        <span className="font-semibold text-foreground">
                          {formData.targetAudience === 'all' ? 'Todos os clientes' : 'Clientes específicos'}
                        </span>
                      </div>
                      {csvUserIds.length > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                          <span className="text-muted-foreground font-medium">CSV:</span>
                          <span className="font-semibold px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                            {csvUserIds.length} usuários carregados
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Criando Promoção...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Criar Promoção
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatePromotionForm;
