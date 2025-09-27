import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import { mockClients, mockPromotions, mockPromotionUsages } from '@/lib/mockData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export const AttendantDashboard = () => {
  const [clientId, setClientId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSearch = () => {
    if (!clientId.trim()) {
      toast({
        title: "ID obrigatório",
        description: "Digite um ID de cliente para pesquisar",
        variant: "destructive",
      });
      return;
    }

    const client = mockClients.find(c => c.id.toLowerCase() === clientId.toLowerCase());
    
    if (!client) {
      setSearchResult({ found: false });
      return;
    }

    // Find active promotions for this client
    const clientPromotions = mockPromotions.filter(promo => {
      if (promo.targetAudience === 'all') return true;
      return promo.targetClientIds?.includes(client.id);
    });

    // Find usage records for this client
    const usageRecords = mockPromotionUsages.filter(usage => usage.clientId === client.id);

    const promotionsWithStatus = clientPromotions.map(promo => {
      const usage = usageRecords.find(u => u.promotionId === promo.id);
      const now = new Date();
      
      let status: 'active' | 'used' | 'expired' = 'active';
      
      if (usage) {
        status = usage.status;
      } else if (promo.endDate < now) {
        status = 'expired';
      }

      return {
        ...promo,
        usage,
        status
      };
    });

    setSearchResult({
      found: true,
      client,
      promotions: promotionsWithStatus
    });
  };

  const handleConfirmUsage = (promotionId: string) => {
    toast({
      title: "Promoção aplicada",
      description: "A promoção foi aplicada com sucesso para o cliente",
    });
    
    // Update the search result to show as used
    if (searchResult?.promotions) {
      const updatedPromotions = searchResult.promotions.map((p: any) => {
        if (p.id === promotionId) {
          return { ...p, status: 'used' };
        }
        return p;
      });
      
      setSearchResult({
        ...searchResult,
        promotions: updatedPromotions
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Disponível', variant: 'default' as const, icon: CheckCircle },
      used: { label: 'Utilizada', variant: 'secondary' as const, icon: XCircle },
      expired: { label: 'Expirada', variant: 'destructive' as const, icon: Clock }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Consulta de Cliente
          </CardTitle>
          <CardDescription>
            Digite o ID do cliente para verificar promoções disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="clientId">ID do Cliente</Label>
              <Input
                id="clientId"
                placeholder="Ex: CLI001"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {searchResult && (
        <Card>
          <CardHeader>
            <CardTitle>
              {searchResult.found ? 'Cliente Encontrado' : 'Cliente Não Encontrado'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchResult.found ? (
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Dados do Cliente</h3>
                  <p><strong>ID:</strong> {searchResult.client.id}</p>
                  <p><strong>Nome:</strong> {searchResult.client.name}</p>
                  <p><strong>Email:</strong> {searchResult.client.email}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-4">Promoções</h3>
                  {searchResult.promotions.length > 0 ? (
                    <div className="space-y-4">
                      {searchResult.promotions.map((promo: any) => (
                        <Card key={promo.id} className="bg-card">
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-medium">{promo.name}</h4>
                                <p className="text-sm text-muted-foreground">{promo.description}</p>
                              </div>
                              {getStatusBadge(promo.status)}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Tipo</p>
                                <p className="font-medium">{promo.type.replace('_', ' ').toUpperCase()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Validade</p>
                                <p className="font-medium flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(promo.endDate, "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                              </div>
                            </div>

                            {promo.status === 'active' && (
                              <Button 
                                className="w-full mt-4" 
                                onClick={() => handleConfirmUsage(promo.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirmar Utilização
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhuma promoção disponível para este cliente.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Cliente com ID "{clientId}" não encontrado na base de dados.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Tente: CLI001, CLI002 ou CLI003
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};