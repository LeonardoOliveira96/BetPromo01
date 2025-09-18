import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Grid3X3, 
  List, 
  Plus, 
  Edit, 
  Trash2,
  Eye,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePromotions } from '@/hooks/use-promotions';
import { useNavigate } from 'react-router-dom';
import { Promotion, MeioComunicacao } from '@/types/promotion';
import { cn } from '@/lib/utils';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type ViewMode = 'table' | 'cards';

const Dashboard = () => {
  const { promotions, deletePromotion, isLoading } = usePromotions();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Filtrar promoções
  const filteredPromotions = useMemo(() => {
    let filtered = promotions;

    // Filtro por busca (nome ou brand)
    if (searchQuery) {
      filtered = filtered.filter(promo => 
        promo.nomePromocao.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promo.brand.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro por data
    if (selectedDate) {
      filtered = filtered.filter(promo => {
        const startDate = new Date(promo.dataInicio);
        const endDate = new Date(promo.dataFim);
        return selectedDate >= startDate && selectedDate <= endDate;
      });
    }

    return filtered;
  }, [promotions, searchQuery, selectedDate]);

  // Agrupar por data de início para visualização em cards
  const groupedPromotions = useMemo(() => {
    if (viewMode !== 'cards') return {};

    return filteredPromotions.reduce((groups, promotion) => {
      const dateKey = format(new Date(promotion.dataInicio), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(promotion);
      return groups;
    }, {} as Record<string, Promotion[]>);
  }, [filteredPromotions, viewMode]);

  const handleDelete = async (id: string) => {
    await deletePromotion(id);
  };

  const formatDateTime = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatDateOnly = (date: Date) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getCommunicationBadges = (meios: MeioComunicacao[]) => {
    const colors: Record<MeioComunicacao, string> = {
      'Push': 'bg-primary/10 text-primary border-primary/20',
      'Inbox': 'bg-success/10 text-success border-success/20',
      'Pop-up': 'bg-warning/10 text-warning border-warning/20',
      'E-mail': 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    };

    return meios.map(meio => (
      <Badge 
        key={meio} 
        variant="outline" 
        className={cn("text-xs", colors[meio])}
      >
        {meio}
      </Badge>
    ));
  };

  const getStatusBadge = (promotion: Promotion) => {
    const now = new Date();
    const start = new Date(promotion.dataInicio);
    const end = new Date(promotion.dataFim);

    if (now < start) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Agendada</Badge>;
    } else if (now >= start && now <= end) {
      return <Badge className="bg-success text-success-foreground">Ativa</Badge>;
    } else {
      return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Encerrada</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promoções Ativas</h1>
          <p className="text-muted-foreground">
            Gerencie todas as suas campanhas promocionais
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/criar-promocao')}
            className="sm:hidden"
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border p-1">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome da promoção ou brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? formatDateOnly(selectedDate) : 'Filtrar por data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
                {selectedDate && (
                  <div className="p-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDate(undefined)}
                      className="w-full"
                    >
                      Limpar filtro
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Active Filters */}
          {(searchQuery || selectedDate) && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Busca: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedDate && (
                <Badge variant="secondary" className="gap-1">
                  Data: {formatDateOnly(selectedDate)}
                  <button
                    onClick={() => setSelectedDate(undefined)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredPromotions.length} promoção(ões) encontrada(s)
        </p>
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Nome da Promoção</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Data Fim</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPromotions.map((promotion) => (
                  <TableRow key={promotion.id}>
                    <TableCell className="font-medium">{promotion.brand}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{promotion.nomePromocao}</TableCell>
                    <TableCell>{getStatusBadge(promotion)}</TableCell>
                    <TableCell>{formatDateTime(promotion.dataInicio)}</TableCell>
                    <TableCell>{formatDateTime(promotion.dataFim)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{promotion.base}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/promocao/${promotion.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/editar-promocao/${promotion.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a promoção "{promotion.nomePromocao}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(promotion.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredPromotions.length === 0 && (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma promoção encontrada</p>
                  <p className="text-sm">Tente ajustar seus filtros ou criar uma nova promoção</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedPromotions).length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-muted-foreground">
                  <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma promoção encontrada</p>
                  <p className="text-sm">Tente ajustar seus filtros ou criar uma nova promoção</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedPromotions)
              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
              .map(([dateKey, dayPromotions]) => (
                <div key={dateKey} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">
                      {format(new Date(dateKey), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </h3>
                    <Badge variant="secondary">{dayPromotions.length} promoção(ões)</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {dayPromotions.map((promotion) => (
                      <Card 
                        key={promotion.id} 
                        className="hover:shadow-md transition-shadow flex flex-col h-full"
                        onClick={() => navigate(`/promocao/${promotion.id}`)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <img 
                                  src={`/images/logo-${promotion.brand.toLowerCase()}.${promotion.brand === 'VeraBet' ? 'jpg' : 'png'}`} 
                                  alt={`Logo ${promotion.brand}`} 
                                  className="w-5 h-5 object-contain" 
                                />
                                <p className="font-semibold text-primary text-sm">{promotion.brand}</p>
                              </div>
                              <h4 className="font-medium text-base leading-tight">{promotion.nomePromocao}</h4>
                              <div className="flex items-center gap-1 mt-1">
                                <span>
                                  {promotion.tipo === 'Cassino' ? '🎰' : 
                                   promotion.tipo === 'Esportivo' ? '⚽' : 
                                   promotion.tipo === 'Ao vivo' ? '🎲' : ''}
                                </span>
                                <span className="text-xs text-muted-foreground">{promotion.tipo}</span>
                              </div>
                            </div>
                            {getStatusBadge(promotion)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 flex-grow">
                          <div className="text-sm grid grid-cols-2 gap-x-2 gap-y-1">
                            <div className="col-span-1">
                              <span className="text-muted-foreground font-medium block">Início:</span> 
                              <span className="text-sm">{formatDateTime(promotion.dataInicio)}</span>
                            </div>
                            <div className="col-span-1">
                              <span className="text-muted-foreground font-medium block">Fim:</span> 
                              <span className="text-sm">{formatDateTime(promotion.dataFim)}</span>
                            </div>
                            <div className="col-span-2 mt-1">
                              <span className="text-muted-foreground font-medium block">Base:</span> 
                              <span className="text-sm">{promotion.base}</span>
                            </div>
                            <div className="col-span-2 mt-1">
                              <span className="text-muted-foreground font-medium block">Meios de comunicação:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {getCommunicationBadges(promotion.meiosComunicacao)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t mt-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/promocao/${promotion.id}`);
                              }}
                              className="flex-1"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Ver
                            </Button>
                            <div className="flex gap-1 flex-1 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/editar-promocao/${promotion.id}`);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                Editar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    Excluir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir a promoção "{promotion.nomePromocao}"? 
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(promotion.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;