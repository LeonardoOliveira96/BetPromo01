import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, User, Calendar, Building, Hash, ExternalLink, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);
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
        const users = response.data.users.map((u) => ({
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
        }));

        setSearchResult({
          users,
          pagination: response.data.pagination,
        });
        setCurrentPage(page);

        // Automaticamente selecionar o primeiro usuário encontrado
        if (users.length > 0) {
          await handleUserDetails(users[0]);
          toast({
            title: "Usuário encontrado",
            description: `Exibindo detalhes de ${users[0].user_ext_id}`,
          });
        } else {
          toast({
            title: "Nenhum usuário encontrado",
            description: "Não foram encontrados usuários com os critérios informados.",
            variant: "destructive",
          });
        }
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
        setIsExpanded(false); // Reset para visualização compacta
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
    <div className="min-h-screen bg-gray-900 p-6">
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

      {/* Resultado da Busca */}
      {selectedUser && (
        <Card className="bg-card border-border shadow-lg">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <span>1 resultado encontrado</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalhes do Usuário Selecionado */}
      {selectedUser && (
        <div className="space-y-6">
          {/* Visualização Compacta */}
          {!isExpanded ? (
            <Card className="bg-card border-border shadow-lg">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <User className="h-6 w-6 text-muted-foreground" />
                  Resumo do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Promoções Ativas */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                        <ExternalLink className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-foreground">Promoções Ativas</Label>
                        <p className="text-xs text-muted-foreground">
                          {selectedUser.current_promotions.length} promoção(ões) encontrada(s)
                        </p>
                      </div>
                    </div>
                    
                    {selectedUser.current_promotions.length > 0 ? (
                      <div className="space-y-3">
                        {selectedUser.current_promotions.slice(0, 2).map((promotion, index) => (
                          <Card key={index} className="bg-gradient-to-r from-gray-800 to-gray-700 border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                            <CardContent className="p-5">
                              <div className="space-y-3">
                                {/* Header da Promoção */}
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-foreground text-base leading-tight">{promotion}</h4>
                                  </div>
                                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-sm">
                                    <div className="flex items-center gap-1">
                                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                      Ativa
                                    </div>
                                  </Badge>
                                </div>

                                {/* Informações do Usuário */}
                                <div className="bg-gray-600/50 rounded-lg p-3 border border-gray-500">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 bg-blue-500/20 rounded">
                                        <Hash className="h-3 w-3 text-blue-400" />
                                      </div>
                                      <div>
                                        <span className="text-xs font-medium text-muted-foreground block">Smartico ID</span>
                                        <p className="text-sm font-semibold text-foreground">{selectedUser.smartico_user_id}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 bg-purple-500/20 rounded">
                                        <Building className="h-3 w-3 text-purple-400" />
                                      </div>
                                      <div>
                                        <span className="text-xs font-medium text-muted-foreground block">Nome da Marca</span>
                                        <p className="text-sm font-semibold text-foreground">{selectedUser.crm_brand_name}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Informações de Data */}
                                <div className="bg-gray-600/50 rounded-lg p-3 border border-gray-500">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 bg-green-500/20 rounded">
                                        <Calendar className="h-3 w-3 text-green-400" />
                                      </div>
                                      <div>
                                        <span className="text-xs font-medium text-muted-foreground block">Início</span>
                                        <p className="text-sm font-semibold text-foreground">01/01/2024</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 bg-red-500/20 rounded">
                                        <Calendar className="h-3 w-3 text-red-400" />
                                      </div>
                                      <div>
                                        <span className="text-xs font-medium text-muted-foreground block">Término</span>
                                        <p className="text-sm font-semibold text-foreground">31/12/2024</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {selectedUser.current_promotions.length > 2 && (
                          <div className="text-center pt-2">
                            <Badge variant="outline" className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300 text-gray-700 px-4 py-2 text-sm font-medium">
                              <Plus className="h-3 w-3 mr-1" />
                              {selectedUser.current_promotions.length - 2} mais promoções
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-200">
                          <ExternalLink className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600 px-4 py-2">
                            Nenhuma Promoção Ativa
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-2">
                            Este usuário não possui promoções ativas no momento
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botão Ver Detalhes */}
                  <div className="pt-4 border-t border-border">
                    <Button 
                      onClick={() => setIsExpanded(true)}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Ver Detalhes Completos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Visualização Expandida */
            <div className="space-y-8">
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
                      <Button 
                        onClick={() => setIsExpanded(false)}
                        variant="outline"
                        size="sm"
                        className="border-border hover:bg-accent"
                      >
                        Voltar ao Resumo
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

          {/* Seção Principal de Informações */}
          <div className="space-y-10">
            {/* Informações Básicas */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground border-b border-border pb-3">
                Informações Básicas
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Identificação */}
                <Card className="bg-card border-border shadow-lg">
                  <CardHeader className="bg-muted/50">
                    <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                      <Hash className="h-5 w-5 text-muted-foreground" />
                      Identificação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
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
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">ID do Sistema</Label>
                        <p className="text-sm font-mono text-foreground bg-muted hover:bg-muted/80 px-3 py-2 rounded-md transition-colors border border-border">
                          {selectedUser._id}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Status do Usuário */}
                <Card className="bg-card border-border shadow-lg">
                  <CardHeader className="bg-muted/50">
                    <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                      <User className="h-5 w-5 text-muted-foreground" />
                      Status do Usuário
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status Atual</Label>
                      <div className="mt-2">
                        <Badge variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200">
                          Ativo
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total de Promoções</Label>
                      <p className="text-lg font-medium text-foreground bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border mt-1">
                        {selectedUser.current_promotions.length} promoções ativas
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Informações da Plataforma */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground border-b border-border pb-3 flex items-center gap-2">
                <Building className="h-5 w-5 text-muted-foreground" />
                Informações da Plataforma
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Marca */}
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
                      <p className="text-lg font-medium text-foreground bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border mt-1">
                        {selectedUser.crm_brand_name}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Brand ID (CRM)</Label>
                        <p className="text-base font-mono bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border mt-1">
                          {selectedUser.crm_brand_id}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Brand ID (Externo)</Label>
                        <p className="text-base font-mono bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border mt-1">
                          {selectedUser.ext_brand_id}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Core SM Brand ID</Label>
                        <p className="text-base font-mono bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border mt-1">
                          {selectedUser.core_sm_brand_id}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Histórico */}
                <Card className="bg-card border-border shadow-lg">
                  <CardHeader className="bg-muted/50">
                    <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      Histórico Temporal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Data de Criação</Label>
                      <p className="text-base font-medium bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border mt-1">
                        {formatDate(selectedUser.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.floor((new Date().getTime() - new Date(selectedUser.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias atrás
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Última Atualização</Label>
                      <p className="text-base font-medium bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border mt-1">
                        {formatDate(selectedUser.updated_at)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.floor((new Date().getTime() - new Date(selectedUser.updated_at).getTime()) / (1000 * 60 * 60 * 24))} dias atrás
                      </p>
                    </div>
                  </CardContent>
                </Card>
               </div>
             </div>

             {/* Seção de Promoções */}
             <div className="space-y-6">
               <h3 className="text-xl font-semibold text-foreground border-b border-border pb-3 flex items-center gap-2">
                 <ExternalLink className="h-5 w-5 text-muted-foreground" />
                 Promoções Ativas
                 <Badge variant="secondary" className="ml-2 bg-secondary text-secondary-foreground">
                   {selectedUser.current_promotions.length}
                 </Badge>
               </h3>
               
               {selectedUser.current_promotions.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {selectedUser.current_promotions.map((promo, index) => (
                     <Card key={index} className="bg-card border-border shadow-lg hover:shadow-xl transition-all duration-300">
                       <CardHeader className="bg-muted/30 pb-3">
                         <CardTitle className="flex items-center gap-2 text-base text-foreground">
                           <Badge className="h-4 w-4 text-muted-foreground" />
                           Promoção #{index + 1}
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="pt-4">
                         <div className="space-y-3">
                           <div>
                             <Label className="text-sm font-medium text-muted-foreground">Nome da Promoção</Label>
                             <p className="text-base font-medium text-foreground bg-input hover:bg-accent px-3 py-2 rounded-md transition-colors border border-border mt-1">
                               {promo}
                             </p>
                           </div>
                           <div>
                             <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                             <div className="mt-1">
                               <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
                                 Ativa
                               </Badge>
                             </div>
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   ))}
                 </div>
               ) : (
                 <Card className="bg-card border-border shadow-lg">
                   <CardContent className="py-8 text-center">
                     <div className="flex flex-col items-center gap-4">
                       <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                         <ExternalLink className="h-8 w-8 text-muted-foreground" />
                       </div>
                       <div>
                         <h4 className="text-lg font-medium text-foreground mb-2">Nenhuma Promoção Ativa</h4>
                         <p className="text-muted-foreground">Este usuário não possui promoções ativas no momento.</p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               )}
             </div>
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
      )}
      </div>
    </div>
  );
};