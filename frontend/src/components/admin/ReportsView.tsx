import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { mockPromotions } from '@/lib/mockData';
import { TrendingUp, Users, Target, CheckCircle } from 'lucide-react';

export const ReportsView = () => {
  const totalPromotions = mockPromotions.length;
  const activePromotions = mockPromotions.filter(p => p.status === 'active').length;
  const totalUsage = mockPromotions.reduce((sum, p) => sum + p.usageCount, 0);
  const totalEligible = mockPromotions.reduce((sum, p) => sum + p.eligibleCount, 0);
  const conversionRate = totalEligible > 0 ? (totalUsage / totalEligible) * 100 : 0;

  const getTypeStats = () => {
    const types = mockPromotions.reduce((acc, promo) => {
      if (!acc[promo.type]) {
        acc[promo.type] = { count: 0, usage: 0, eligible: 0 };
      }
      acc[promo.type].count++;
      acc[promo.type].usage += promo.usageCount;
      acc[promo.type].eligible += promo.eligibleCount;
      return acc;
    }, {} as Record<string, { count: number; usage: number; eligible: number }>);

    return Object.entries(types).map(([type, stats]) => ({
      type,
      ...stats,
      conversion: stats.eligible > 0 ? (stats.usage / stats.eligible) * 100 : 0
    }));
  };

  const typeStats = getTypeStats();

  const getTypeLabel = (type: string) => {
    const types = {
      deposit_bonus: 'Bônus de Depósito',
      cashback: 'Cashback',
      free_bet: 'Aposta Grátis'
    };
    return types[type as keyof typeof types] || type;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Promoções</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPromotions}</div>
            <p className="text-xs text-muted-foreground">
              {activePromotions} ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Promoções utilizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Elegíveis</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEligible}</div>
            <p className="text-xs text-muted-foreground">
              Com acesso às promoções
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Elegíveis que utilizaram
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Promoção</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {mockPromotions.map((promo) => {
            const conversion = promo.eligibleCount > 0 ? (promo.usageCount / promo.eligibleCount) * 100 : 0;
            
            return (
              <div key={promo.id} className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{promo.name}</h4>
                    <p className="text-sm text-muted-foreground">{getTypeLabel(promo.type)}</p>
                  </div>
                  <Badge variant={promo.status === 'active' ? 'default' : 'secondary'}>
                    {promo.status === 'active' ? 'Ativa' : promo.status === 'expired' ? 'Expirada' : 'Pausada'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Utilizações</p>
                    <p className="font-medium">{promo.usageCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Elegíveis</p>
                    <p className="font-medium">{promo.eligibleCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Conversão</p>
                    <p className="font-medium">{conversion.toFixed(1)}%</p>
                  </div>
                </div>
                
                <Progress value={conversion} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estatísticas por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {typeStats.map((stat) => (
              <div key={stat.type} className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <div>
                  <h4 className="font-medium">{getTypeLabel(stat.type)}</h4>
                  <p className="text-sm text-muted-foreground">{stat.count} promoções</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{stat.usage} / {stat.eligible}</p>
                  <p className="text-sm text-muted-foreground">{stat.conversion.toFixed(1)}% conversão</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};