import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, User, Calendar, Building, Hash, ExternalLink, ChevronLeft, ChevronRight, Plus, Eye, Clock, FileText, Tag, Bell, Mail, MessageSquare, Smartphone, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface PromotionDetails {
  promocao_id: number;
  nome: string;
  regras?: string;
  data_inicio: string;
  data_fim: string;
  status: 'active' | 'inactive' | 'expired' | 'scheduled';
  created_at: string;
  updated_at: string;
  marca?: string;
  tipo?: string;
  notification_sms?: boolean;
  notification_email?: boolean;
  notification_popup?: boolean;
  notification_push?: boolean;
  notification_whatsapp?: boolean;
  notification_telegram?: boolean;
}

export const UserSearch = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'smartico_user_id' | 'user_ext_id' | 'both'>('both');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [selectedUser, setSelectedUser] = useState<PromotionUser | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Estados para o modal de detalhes da promoção
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionDetails | null>(null);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [isLoadingPromotion, setIsLoadingPromotion] = useState(false);

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
      console.log('🔍 Frontend - Buscando detalhes do usuário:', user.smartico_user_id);

      const data = await apiService.getUserDetails(user.smartico_user_id.toString(), 'smartico_user_id');

      console.log('🔍 Frontend - Resposta da API:', data);

      if (data.success) {
        console.log('🔍 Frontend - Promoções recebidas:', {
          userId: data.data.smartico_user_id,
          promotions: data.data.current_promotions,
          promotionsCount: data.data.current_promotions ? data.data.current_promotions.length : 0
        });

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

  const handlePromotionClick = async (promotionName: string) => {
    setIsLoadingPromotion(true);
    setIsPromotionModalOpen(true);

    console.log('🔍 Buscando detalhes da promoção:', promotionName);

    // Verificar se há token de autenticação
    const token = localStorage.getItem('auth_token_data');
    console.log('🔐 Token disponível:', !!token);
    if (token) {
      try {
        const tokenData = JSON.parse(token);
        console.log('🕐 Token expira em:', new Date(tokenData.expiresAt));
      } catch (e) {
        console.log('❌ Erro ao parsear token');
      }
    }

    try {
      // Primeira tentativa: busca exata por nome
      const response = await apiService.get<{
        success: boolean;
        data: PromotionDetails[];
        pagination: {
          currentPage: number;
          totalPages: number;
          totalCount: number;
          limit: number;
          hasNextPage: boolean;
          hasPrevPage: boolean;
        };
      }>(`/promocoes?search=${encodeURIComponent(promotionName)}&limit=10`);

      console.log('📊 Resposta da API:', response);

      let foundPromotion = null;

      if (response.success && response.data.length > 0) {
        // Tentar encontrar uma correspondência exata primeiro
        foundPromotion = response.data.find(promo => promo.nome === promotionName);

        // Se não encontrar correspondência exata, usar a primeira que contenha o nome
        if (!foundPromotion) {
          foundPromotion = response.data.find(promo =>
            promo.nome.toLowerCase().includes(promotionName.toLowerCase()) ||
            promotionName.toLowerCase().includes(promo.nome.toLowerCase())
          );
        }

        // Se ainda não encontrar, usar a primeira da lista
        if (!foundPromotion) {
          foundPromotion = response.data[0];
        }
      }

      if (foundPromotion) {
        console.log('✅ Promoção encontrada:', foundPromotion);
        setSelectedPromotion(foundPromotion);
      } else {
        console.log('⚠️ Promoção não encontrada na API, tentando buscar todas as promoções...');

        // Segunda tentativa: buscar todas as promoções e filtrar localmente
        const allPromotionsResponse = await apiService.get<{
          success: boolean;
          data: PromotionDetails[];
          pagination: {
            currentPage: number;
            totalPages: number;
            totalCount: number;
            limit: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
          };
        }>(`/promocoes?limit=100`);

        console.log('📋 Todas as promoções:', allPromotionsResponse);

        if (allPromotionsResponse.success && allPromotionsResponse.data.length > 0) {
          const matchedPromotion = allPromotionsResponse.data.find(promo =>
            promo.nome === promotionName ||
            promo.nome.toLowerCase().includes(promotionName.toLowerCase()) ||
            promotionName.toLowerCase().includes(promo.nome.toLowerCase())
          );

          if (matchedPromotion) {
            console.log('✅ Promoção encontrada na segunda tentativa:', matchedPromotion);
            setSelectedPromotion(matchedPromotion);
          } else {
            console.log('❌ Promoção não encontrada, usando dados mock');
            // Se não encontrar via API, usar dados mock
            const mockPromotionDetails: PromotionDetails = {
              promocao_id: Math.floor(Math.random() * 1000),
              nome: promotionName,
              regras: "⚠️ DADOS MOCK - Esta promoção não foi encontrada no banco de dados. As datas e informações exibidas são fictícias para demonstração.",
              data_inicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'active',
              created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
              marca: '7k',
              tipo: 'Dados Mock',
              notification_sms: true,
              notification_email: true,
              notification_popup: false,
              notification_push: true,
              notification_whatsapp: false,
              notification_telegram: true
            };
            setSelectedPromotion(mockPromotionDetails);
          }
        } else {
          console.log('❌ Erro ao buscar todas as promoções, usando dados mock');
          // Se não conseguir buscar, usar dados mock
          const mockPromotionDetails: PromotionDetails = {
            promocao_id: Math.floor(Math.random() * 1000),
            nome: promotionName,
            regras: "⚠️ DADOS MOCK - Erro ao conectar com o banco de dados. As datas e informações exibidas são fictícias.",
            data_inicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active',
            created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            marca: 'verabet',
            tipo: 'Dados Mock',
            notification_sms: false,
            notification_email: true,
            notification_popup: true,
            notification_push: false,
            notification_whatsapp: true,
            notification_telegram: false
          };
          setSelectedPromotion(mockPromotionDetails);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar detalhes da promoção:', error);

      // Em caso de erro, usar dados mock como fallback
      const mockPromotionDetails: PromotionDetails = {
        promocao_id: Math.floor(Math.random() * 1000),
        nome: promotionName,
        regras: "⚠️ DADOS MOCK - Erro de conexão com a API. As datas e informações exibidas são fictícias.",
        data_inicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        marca: 'erro',
        tipo: 'Dados Mock',
        notification_sms: false,
        notification_email: true,
        notification_popup: true,
        notification_push: false,
        notification_whatsapp: true,
        notification_telegram: false
      };
      setSelectedPromotion(mockPromotionDetails);

      toast({
        title: "Aviso",
        description: "Exibindo dados de exemplo. Verifique a conexão com a API.",
        variant: "default",
      });
    } finally {
      setIsLoadingPromotion(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Ativa', className: 'bg-green-600 hover:bg-green-700 text-white' },
      inactive: { label: 'Inativa', className: 'bg-gray-600 hover:bg-gray-700 text-white' },
      expired: { label: 'Expirada', className: 'bg-red-600 hover:bg-red-700 text-white' },
      scheduled: { label: 'Agendada', className: 'bg-blue-600 hover:bg-blue-700 text-white' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
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

        {/* Tabela de Promoções */}
        {selectedUser && (
          <div className="space-y-6">
            <Card className="bg-card border-border shadow-lg">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-xl font-semibold text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                  Promoções Ativas - {selectedUser.crm_brand_name}
                  <Badge variant="secondary" className="ml-2 bg-secondary text-secondary-foreground">
                    {selectedUser.current_promotions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {selectedUser.current_promotions.length > 0 ? (
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">#</TableHead>
                          <TableHead>Nome da Promoção</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUser.current_promotions.map((promo, index) => (
                          <TableRow key={index} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell className="font-medium">
                              {promo}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
                                Ativa
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePromotionClick(promo)}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Ver Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                        <ExternalLink className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-foreground mb-2">Nenhuma Promoção Ativa</h4>
                        <p className="text-muted-foreground">Este usuário não possui promoções ativas no momento.</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal de Detalhes da Promoção */}
        <Dialog open={isPromotionModalOpen} onOpenChange={setIsPromotionModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalhes da Promoção
              </DialogTitle>
              <DialogDescription>
                Informações completas sobre a promoção selecionada
              </DialogDescription>
            </DialogHeader>

            {isLoadingPromotion ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : selectedPromotion ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">ID da Promoção</Label>
                    <p className="text-base font-medium text-foreground bg-muted/50 px-3 py-2 rounded-md mt-1">
                      #{selectedPromotion.promocao_id}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedPromotion.status)}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nome da Promoção</Label>
                  <p className="text-lg font-semibold text-foreground bg-muted/50 px-3 py-2 rounded-md mt-1">
                    {selectedPromotion.nome}
                  </p>
                </div>

                {selectedPromotion.regras && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Regras</Label>
                    <p className="text-base text-foreground bg-muted/50 px-3 py-2 rounded-md mt-1 whitespace-pre-wrap">
                      {selectedPromotion.regras}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Data de Início
                    </Label>
                    <p className="text-base font-medium text-foreground bg-muted/50 px-3 py-2 rounded-md mt-1">
                      {formatDate(selectedPromotion.data_inicio)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Data de Fim
                    </Label>
                    <p className="text-base font-medium text-foreground bg-muted/50 px-3 py-2 rounded-md mt-1">
                      {formatDate(selectedPromotion.data_fim)}
                    </p>
                  </div>
                </div>

                {/* Informações da Marca e Tipo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Marca
                    </Label>
                    <p className="text-base font-medium text-foreground bg-muted/50 px-3 py-2 rounded-md mt-1">
                      {selectedPromotion.marca || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tipo de Promoção
                    </Label>
                    <p className="text-base font-medium text-foreground bg-muted/50 px-3 py-2 rounded-md mt-1">
                      {selectedPromotion.tipo || 'Não informado'}
                    </p>
                  </div>
                </div>

                {/* Notificações Enviadas */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
                    <Bell className="h-4 w-4" />
                    Notificações Enviadas
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className={`flex items-center gap-2 p-2 rounded-md border ${selectedPromotion.notification_sms ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      <Phone className="h-4 w-4" />
                      <span className="text-sm font-medium">SMS</span>
                      {selectedPromotion.notification_sms && <span className="text-xs">✓</span>}
                    </div>
                    <div className={`flex items-center gap-2 p-2 rounded-md border ${selectedPromotion.notification_email ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      <Mail className="h-4 w-4" />
                      <span className="text-sm font-medium">Email</span>
                      {selectedPromotion.notification_email && <span className="text-xs">✓</span>}
                    </div>
                    <div className={`flex items-center gap-2 p-2 rounded-md border ${selectedPromotion.notification_popup ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-sm font-medium">Pop-up</span>
                      {selectedPromotion.notification_popup && <span className="text-xs">✓</span>}
                    </div>
                    <div className={`flex items-center gap-2 p-2 rounded-md border ${selectedPromotion.notification_push ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      <Smartphone className="h-4 w-4" />
                      <span className="text-sm font-medium">Push</span>
                      {selectedPromotion.notification_push && <span className="text-xs">✓</span>}
                    </div>
                    <div className={`flex items-center gap-2 p-2 rounded-md border ${selectedPromotion.notification_whatsapp ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm font-medium">WhatsApp</span>
                      {selectedPromotion.notification_whatsapp && <span className="text-xs">✓</span>}
                    </div>
                    <div className={`flex items-center gap-2 p-2 rounded-md border ${selectedPromotion.notification_telegram ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm font-medium">Telegram</span>
                      {selectedPromotion.notification_telegram && <span className="text-xs">✓</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Criado em</Label>
                    <p className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md mt-1">
                      {formatDate(selectedPromotion.created_at)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Atualizado em</Label>
                    <p className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md mt-1">
                      {formatDate(selectedPromotion.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};