import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, User, Calendar, Building, Hash, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';

interface PromotionUser {
  _id: string;
  smartico_user_id: number;
  user_ext_id: string;
  core_sm_brand_id: number;
  crm_brand_id: number;
  ext_brand_id: string;
  crm_brand_name: string;
  current_promotions: string[];
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  users: PromotionUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface QuickSearchResult {
  smartico_user_id: number;
  user_ext_id: string;
  crm_brand_name: string;
}

export const UserSearch = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'smartico_user_id' | 'user_ext_id' | 'both'>('both');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [selectedUser, setSelectedUser] = useState<PromotionUser | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [quickSuggestions, setQuickSuggestions] = useState<QuickSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { toast } = useToast();

  // Busca rápida para autocomplete
  const fetchQuickSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setQuickSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await apiService.quickSearch(searchQuery);

      if (response.success && Array.isArray(response.data)) {
        setQuickSuggestions(response.data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Erro na busca rápida:', error);
    }
  }, []);

  // Debounce para busca rápida
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        fetchQuickSuggestions(query.trim());
      } else {
        setQuickSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, fetchQuickSuggestions]);

  const handleSearch = async (page = 1) => {
    if (!query.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite um termo para pesquisar",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const response = await apiService.searchUsers(query.trim(), searchType, page, 20);

      if (response.success && response.data) {
        setSearchResult({
          users: response.data.users.map((u) => ({
            _id: u.smartico_user_id.toString(),
            smartico_user_id: u.smartico_user_id,
            user_ext_id: u.user_ext_id,
            core_sm_brand_id: u.core_sm_brand_id,
            crm_brand_id: u.crm_brand_id,
            ext_brand_id: u.ext_brand_id,
            crm_brand_name: u.crm_brand_name,
            current_promotions: u.current_promotions,
            created_at: u.created_at,
            updated_at: u.updated_at,
          })),
          pagination: response.data.pagination,
        });
        setCurrentPage(page);
        toast({
          title: "Busca realizada",
          description: `Encontrado(s) ${response.data.users.length} usuário(s)`,
        });
      } else {
        toast({
          title: "Erro na busca",
          description: response.message || 'Erro desconhecido',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível realizar a busca. Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserDetails = async (user: PromotionUser) => {
    setIsLoading(true);
    try {
      const data = await apiService.getUserDetails(user.smartico_user_id.toString(), 'smartico_user_id');

      if (data.success) {
        setSelectedUser(data.data as PromotionUser);
      } else {
        toast({
          title: "Erro ao carregar detalhes",
          description: data.message?.toString() || 'Erro desconhecido',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível carregar os detalhes do usuário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: QuickSearchResult) => {
    setQuery(suggestion.user_ext_id);
    setSearchType('user_ext_id');
    setShowSuggestions(false);
    setTimeout(() => handleSearch(), 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Usuário
          </CardTitle>
          <CardDescription>
            Busque usuários por Smartico ID ou ID Externo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Label htmlFor="search-query">Termo de Busca</Label>
              <Input
                id="search-query"
                placeholder="Digite o ID do usuário..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />

              {/* Sugestões de autocomplete */}
              {showSuggestions && quickSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {quickSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{suggestion.user_ext_id}</div>
                          <div className="text-sm text-gray-500">ID: {suggestion.smartico_user_id}</div>
                        </div>
                        <div className="text-sm text-gray-400">{suggestion.crm_brand_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="search-type">Tipo de Busca</Label>
              <Select value={searchType} onValueChange={(value: 'smartico_user_id' | 'user_ext_id' | 'both') => setSearchType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Ambos os campos</SelectItem>
                  <SelectItem value="smartico_user_id">Smartico ID</SelectItem>
                  <SelectItem value="user_ext_id">ID Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => handleSearch()}
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Buscando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados da Busca */}
      {searchResult && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados da Busca</CardTitle>
            <CardDescription>
              {searchResult.pagination.totalCount} usuário(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searchResult.users.length === 0 ? (
              <Alert>
                <Search className="h-4 w-4" />
                <AlertDescription>
                  Nenhum usuário encontrado com os critérios de busca informados.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {searchResult.users.map((user) => (
                  <div
                    key={user._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleUserDetails(user)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{user.user_ext_id}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            <span>Smartico ID: {user.smartico_user_id}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span>{user.crm_brand_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Atualizado: {formatDate(user.updated_at)}</span>
                          </div>
                        </div>
                        {user.current_promotions.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {user.current_promotions.slice(0, 3).map((promo, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {promo}
                              </Badge>
                            ))}
                            {user.current_promotions.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.current_promotions.length - 3} mais
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))}

                {/* Paginação */}
                {searchResult.pagination.totalPages > 1 && (
                  <div className="flex justify-between items-center pt-4">
                    <div className="text-sm text-gray-600">
                      Página {searchResult.pagination.currentPage} de {searchResult.pagination.totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(currentPage - 1)}
                        disabled={!searchResult.pagination.hasPrevPage || isLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(currentPage + 1)}
                        disabled={!searchResult.pagination.hasNextPage || isLoading}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detalhes do Usuário Selecionado */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalhes do Usuário
            </CardTitle>
            <CardDescription>
              Informações completas do usuário selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">ID Externo</Label>
                  <p className="text-lg font-medium">{selectedUser.user_ext_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Smartico ID</Label>
                  <p className="text-lg font-medium">{selectedUser.smartico_user_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Marca</Label>
                  <p className="text-lg font-medium">{selectedUser.crm_brand_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Brand ID (CRM)</Label>
                  <p className="text-lg font-medium">{selectedUser.crm_brand_id}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Brand ID (Externo)</Label>
                  <p className="text-lg font-medium">{selectedUser.ext_brand_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Core SM Brand ID</Label>
                  <p className="text-lg font-medium">{selectedUser.core_sm_brand_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Criado em</Label>
                  <p className="text-lg font-medium">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Última atualização</Label>
                  <p className="text-lg font-medium">{formatDate(selectedUser.updated_at)}</p>
                </div>
              </div>
            </div>

            {selectedUser.current_promotions.length > 0 && (
              <div className="mt-6">
                <Label className="text-sm font-medium text-gray-500">Promoções Ativas</Label>
                <div className="flex gap-2 flex-wrap mt-2">
                  {selectedUser.current_promotions.map((promo, index) => (
                    <Badge key={index} variant="default">
                      {promo}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedUser(null)}
              >
                Fechar Detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};