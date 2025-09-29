import { useState, useCallback } from 'react';
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

export const UserSearch = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'smartico_user_id' | 'user_ext_id' | 'both'>('both');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [selectedUser, setSelectedUser] = useState<PromotionUser | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

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
        setSelectedUser({
          ...data.data,
          _id: data.data.smartico_user_id.toString(),
        });
      } else {
        toast({
          title: "Erro ao carregar detalhes",
          description: data.message,
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
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="bg-muted/50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Search className="h-5 w-5 text-muted-foreground" />
            Busca de Usuários
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Busque usuários por Smartico ID ou ID Externo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search-query" className="text-foreground font-medium">Termo de Busca</Label>
              <Input
                id="search-query"
                placeholder="Digite o ID do usuário..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-input border-border text-foreground placeholder-muted-foreground focus:border-ring focus:ring-ring transition-all duration-200"
              />
            </div>

            <div>
              <Label htmlFor="search-type" className="text-foreground font-medium">Tipo de Busca</Label>
              <Select value={searchType} onValueChange={(value: 'smartico_user_id' | 'user_ext_id' | 'both') => setSearchType(value)}>
                <SelectTrigger className="bg-input border-border text-foreground focus:border-ring focus:ring-ring transition-all duration-200">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Ambos</SelectItem>
                  <SelectItem value="smartico_user_id">Smartico ID</SelectItem>
                  <SelectItem value="user_ext_id">ID Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => handleSearch()}
            disabled={isLoading || !query.trim()}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
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
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              Resultados da Busca
            </CardTitle>
            <CardDescription className="text-muted-foreground">
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
                    className="border border-border rounded-lg p-4 bg-card hover:bg-accent hover:border-accent-foreground cursor-pointer transition-all duration-300 hover:shadow-md"
                    onClick={() => handleUserDetails(user)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{user.user_ext_id}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            <span>Smartico ID: {user.smartico_user_id}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span>{user.crm_brand_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>Atualizado: {formatDate(user.updated_at)}</span>
                          </div>
                        </div>
                        {user.current_promotions.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {user.current_promotions.slice(0, 3).map((promo, index) => (
                              <Badge key={index} variant="secondary" className="text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-200">
                                {promo}
                              </Badge>
                            ))}
                            {user.current_promotions.length > 3 && (
                              <Badge variant="outline" className="text-xs text-muted-foreground border-border hover:bg-accent transition-all duration-200">
                                +{user.current_promotions.length - 3} mais
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </div>
                  </div>
                ))}

                {/* Paginação */}
                {searchResult.pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-6 p-4 bg-muted/30 rounded-lg border border-border">
                    <Button
                      variant="outline"
                      onClick={() => handleSearch(searchResult.pagination.currentPage - 1)}
                      disabled={searchResult.pagination.currentPage === 1}
                      className="bg-card hover:bg-accent text-foreground border-border"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    
                    <span className="text-sm text-foreground font-medium">
                      Página {searchResult.pagination.currentPage} de {searchResult.pagination.totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleSearch(searchResult.pagination.currentPage + 1)}
                      disabled={searchResult.pagination.currentPage === searchResult.pagination.totalPages}
                      className="bg-card hover:bg-accent text-foreground border-border"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detalhes do Usuário Selecionado */}
      {selectedUser && (
        <div className="space-y-6">
          {/* Header com informações principais */}
          <Card className="bg-card border-border shadow-lg">
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                    <User className="h-6 w-6 text-muted-foreground" />
                    {selectedUser.user_ext_id}
                  </CardTitle>
                  <CardDescription className="text-base mt-1 text-muted-foreground">
                    {selectedUser.crm_brand_name} • Smartico ID: {selectedUser.smartico_user_id}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm bg-gray-200 hover:bg-gray-300 transition-colors border-gray-400">
                    ID: {selectedUser._id.slice(-8)}
                  </Badge>
                  <Badge 
                    variant={selectedUser.current_promotions.length > 0 ? "default" : "secondary"}
                    className={`text-sm transition-all duration-200 ${
                      selectedUser.current_promotions.length > 0 
                        ? "bg-gray-600 hover:bg-gray-700 text-white" 
                        : "bg-gray-300 hover:bg-gray-400 text-gray-700"
                    }`}
                  >
                    {selectedUser.current_promotions.length} Promoções Ativas
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informações de Identificação */}
            <Card className="bg-card border-border shadow-lg">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                  Identificação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">ID Externo</Label>
                    <p className="text-lg font-medium font-mono bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border">
                      {selectedUser.user_ext_id}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Smartico ID</Label>
                    <p className="text-lg font-medium font-mono bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border">
                      {selectedUser.smartico_user_id}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">ID do Sistema</Label>
                  <p className="text-sm font-mono text-foreground bg-muted hover:bg-muted/80 px-3 py-2 rounded-md transition-colors border border-border">
                    {selectedUser._id}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Informações da Marca */}
            <Card className="bg-card border-border shadow-lg">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  Marca e Plataforma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nome da Marca</Label>
                  <p className="text-lg font-medium text-foreground bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border">{selectedUser.crm_brand_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Brand ID (CRM)</Label>
                    <p className="text-base font-mono bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border">
                      {selectedUser.crm_brand_id}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Brand ID (Externo)</Label>
                    <p className="text-base font-mono bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border">
                      {selectedUser.ext_brand_id}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Core SM Brand ID</Label>
                  <p className="text-base font-mono bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border">
                    {selectedUser.core_sm_brand_id}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Informações Temporais */}
            <Card className="bg-card border-border shadow-lg">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  Histórico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data de Criação</Label>
                  <p className="text-base font-medium bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border">{formatDate(selectedUser.created_at)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.floor((new Date().getTime() - new Date(selectedUser.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias atrás
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Última Atualização</Label>
                  <p className="text-base font-medium bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border">{formatDate(selectedUser.updated_at)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.floor((new Date().getTime() - new Date(selectedUser.updated_at).getTime()) / (1000 * 60 * 60 * 24))} dias atrás
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Status e Promoções */}
            <Card className="bg-card border-border shadow-lg">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                  Status e Promoções
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status do Usuário</Label>
                  <Badge variant="default" className="mt-1 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200">
                    Ativo
                  </Badge>
                </div>
                
                {selectedUser.current_promotions.length > 0 ? (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Promoções Ativas ({selectedUser.current_promotions.length})
                    </Label>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {selectedUser.current_promotions.map((promo, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-all duration-200 border border-border">
                          {promo}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Promoções Ativas</Label>
                    <p className="text-sm text-muted-foreground mt-1 bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border">Nenhuma promoção ativa no momento</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ações */}
          <Card className="bg-card border-border shadow-lg">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="gap-2 bg-card hover:bg-accent text-foreground border-border hover:border-accent-foreground transition-all duration-200">
                  <ExternalLink className="h-4 w-4" />
                  Ver no Smartico
                </Button>
                <Button variant="outline" className="gap-2 bg-card hover:bg-accent text-foreground border-border hover:border-accent-foreground transition-all duration-200">
                  <Calendar className="h-4 w-4" />
                  Histórico Completo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedUser(null)}
                  className="ml-auto bg-card hover:bg-accent text-foreground border-border hover:border-accent-foreground transition-all duration-200"
                >
                  Fechar Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};