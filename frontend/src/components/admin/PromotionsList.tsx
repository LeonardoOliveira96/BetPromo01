import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Filter, Edit, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Promotion } from '@/types';

// Dados de exemplo para visualizar o problema
const samplePromotions: Promotion[] = [
  {
    id: 1,
    name: 'Bônus de Boas-vindas 100%',
    brand: 'Casa de Apostas Premium',
    description: 'Bônus de 100% até R$ 500 no primeiro depósito',
    type: 'deposit_bonus',
    status: 'active',
    data_inicio: '2024-01-15T10:00:00Z',
    data_fim: '2024-03-15T23:59:59Z',
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    name: 'Cashback Semanal',
    brand: 'Bet Express',
    description: 'Receba 10% de cashback em suas perdas semanais',
    type: 'cashback',
    status: 'active',
    data_inicio: '2024-01-01T00:00:00Z',
    data_fim: '2024-12-31T23:59:59Z',
    created_at: '2023-12-28T08:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    name: 'Aposta Grátis Copa',
    brand: 'SportsBet Pro',
    description: 'Aposta grátis de R$ 50 para jogos da Copa',
    type: 'free_bet',
    status: 'expired',
    data_inicio: '2023-11-20T00:00:00Z',
    data_fim: '2023-12-18T23:59:59Z',
    created_at: '2023-11-15T08:00:00Z',
    updated_at: '2023-12-18T23:59:59Z'
  }
];

export const PromotionsList = () => {
  const [promotions] = useState<Promotion[]>(samplePromotions);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Filtrar promoções baseado na busca e status
   const filteredPromotions = promotions.filter(promotion => {
     const matchesSearch = promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          promotion.brand.toLowerCase().includes(searchTerm.toLowerCase());
     const matchesStatus = statusFilter === 'all' || promotion.status === statusFilter;
     return matchesSearch && matchesStatus;
   });

   return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promoções</h1>
          <p className="text-muted-foreground">
            Gerencie todas as promoções da plataforma
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Promoção
        </Button>
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
                  placeholder="Buscar por nome ou descrição..."
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
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Promoções</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {filteredPromotions.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={7} className="text-center py-8">
                     Nenhuma promoção encontrada
                   </TableCell>
                 </TableRow>
               ) : (
                 filteredPromotions.map((promotion) => (
                  <TableRow key={promotion.id}>
                    <TableCell className="font-medium">{promotion.name}</TableCell>
                    <TableCell>{promotion.brand}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {promotion.type === 'deposit_bonus' && 'Bônus Depósito'}
                        {promotion.type === 'cashback' && 'Cashback'}
                        {promotion.type === 'free_bet' && 'Aposta Grátis'}
                        {promotion.type === 'no_deposit' && 'Sem Depósito'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={promotion.status === 'active' ? 'default' : 
                                 promotion.status === 'expired' ? 'destructive' : 'secondary'}
                      >
                        {promotion.status === 'active' && 'Ativa'}
                        {promotion.status === 'expired' && 'Expirada'}
                        {promotion.status === 'draft' && 'Rascunho'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                       {format(new Date(promotion.data_inicio), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                     </TableCell>
                     <TableCell className="text-foreground">
                       {format(new Date(promotion.data_fim), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                     </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};