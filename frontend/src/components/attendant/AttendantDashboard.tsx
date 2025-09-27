import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AttendantDashboard = () => {
  const [clientId, setClientId] = useState('');
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

    // TODO: Implementar busca na API quando disponível
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A busca de clientes será implementada quando a API estiver disponível",
      variant: "default",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard do Atendente</h1>
        <p className="text-muted-foreground">
          Busque clientes e gerencie suas promoções
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Cliente</CardTitle>
          <CardDescription>
            Digite o ID do cliente para visualizar suas informações e promoções disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="clientId">ID do Cliente</Label>
              <Input
                id="clientId"
                placeholder="Digite o ID do cliente..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultado da Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Digite um ID de cliente e clique em "Buscar" para ver os resultados</p>
            <p className="text-sm mt-2">A funcionalidade será implementada quando a API estiver disponível</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};