import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Edit, Trash2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';

interface Promotion {
  promocao_id: number;
  nome: string;
  regras?: string;
  data_inicio: string;
  data_fim: string;
  status: 'active' | 'inactive' | 'expired' | 'scheduled';
  created_at: string;
  updated_at: string;
}

interface PromotionsResponse {
  success: boolean;
  data: Promotion[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
}

export const PromotionsList = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Função para buscar promoções da API
  const fetchPromotions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Construir parâmetros de query
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      const queryString = params.toString();
      const endpoint = `/promocoes${queryString ? `?${queryString}` : ''}`;
      
      const response: PromotionsResponse = await apiService.get(endpoint);
      
      if (response.success) {
        setPromotions(response.data || []);
      } else {
        throw new Error(response.message || 'Erro ao buscar promoções');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao buscar promoções';
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm, toast]);

  // Carregar promoções na inicialização
  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  // Recarregar quando filtros mudarem (com debounce para busca)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPromotions();
    }, searchTerm ? 500 : 0); // Debounce de 500ms para busca

    return () => clearTimeout(timeoutId);
  }, [statusFilter, searchTerm, fetchPromotions]);

  // Filtrar promoções localmente (backup caso a API não suporte filtros)
  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = searchTerm === '' ||
      promotion.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (promotion.regras && promotion.regras.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || promotion.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Ativa</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inativa</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirada</Badge>;
      case 'scheduled':
        return <Badge variant="outline">Agendada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promoções</h1>
          <p className="text-muted-foreground">
            Visualize todas as promoções da plataforma
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar promoções específicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou regras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Promoções</CardTitle>
          <CardDescription>
            {isLoading ? 'Carregando...' : `${filteredPromotions.length} promoção(ões) encontrada(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando promoções...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <button
                onClick={fetchPromotions}
                className="text-primary hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPromotions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Nenhuma promoção encontrada com os filtros aplicados'
                        : 'Nenhuma promoção cadastrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPromotions.map((promotion) => (
                    <TableRow key={promotion.promocao_id}>
                      <TableCell className="font-medium">#{promotion.promocao_id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{promotion.nome}</div>
                          {promotion.regras && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {promotion.regras}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(promotion.status)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatDate(promotion.data_inicio)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatDate(promotion.data_fim)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatDate(promotion.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};