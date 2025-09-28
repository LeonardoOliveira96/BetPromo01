import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, Calendar, Tag, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { apiService } from '@/lib/api';

interface UserPromotion {
  promocao_id: number;
  nome: string;
  regras: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  status_calculado: string;
  data_vinculo: string;
  data_atualizacao_vinculo: string;
}

interface UserPromotionsData {
  smartico_user_id: number;
  user_ext_id: string;
  crm_brand_name: string;
  promotions: UserPromotion[];
}

interface UserPromotionsModalProps {
  smarticoUserId: number;
  userExtId?: string;
  userName?: string;
  trigger?: React.ReactNode;
}

const UserPromotionsModal: React.FC<UserPromotionsModalProps> = ({
  smarticoUserId,
  userExtId,
  userName,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [promotionsData, setPromotionsData] = useState<UserPromotionsData | null>(null);

  const fetchUserPromotions = useCallback(async () => {
    if (!smarticoUserId) return;

    setLoading(true);
    try {
      const response = await apiService.get(`/consulta/${smarticoUserId}/promotions`);

      if ((response as { data: { success: boolean } }).data.success) {
        setPromotionsData((response as { data: { data: UserPromotionsData } }).data.data);
      } else {
        toast.error('Erro ao carregar promoções do usuário');
      }
    } catch (error) {
      console.error('Erro ao buscar promoções:', error);
      toast.error('Erro ao carregar promoções do usuário');
    } finally {
      setLoading(false);
    }
  }, [smarticoUserId]);

  useEffect(() => {
    if (isOpen && smarticoUserId) {
      fetchUserPromotions();
    }
  }, [isOpen, smarticoUserId, fetchUserPromotions]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ativa':
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inativa':
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pausada':
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'finalizada':
      case 'finished':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Eye className="h-4 w-4" />
      Ver Promoções
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Promoções do Usuário
            {userName && <span className="text-sm font-normal text-gray-600">- {userName}</span>}
          </DialogTitle>
          <div className="text-sm text-gray-600">
            <p>Smartico ID: <span className="font-mono">{smarticoUserId}</span></p>
            {userExtId && <p>Ext ID: <span className="font-mono">{userExtId}</span></p>}
          </div>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando promoções...</span>
            </div>
          ) : promotionsData ? (
            <div className="space-y-4">
              {promotionsData.promotions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma promoção encontrada para este usuário.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Total de promoções: <span className="font-semibold">{promotionsData.promotions.length}</span>
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {promotionsData.promotions.map((promotion) => (
                      <Card key={promotion.promocao_id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg">{promotion.nome}</CardTitle>
                            <div className="flex gap-2">
                              <Badge className={getStatusColor(promotion.status)}>
                                {promotion.status}
                              </Badge>
                              {promotion.status_calculado && promotion.status_calculado !== promotion.status && (
                                <Badge variant="outline">
                                  {promotion.status_calculado}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">Período:</span>
                              </div>
                              <div className="text-sm text-gray-600 ml-6">
                                <p>Início: {formatDate(promotion.data_inicio)}</p>
                                <p>Fim: {formatDate(promotion.data_fim)}</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Tag className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">Vínculo:</span>
                              </div>
                              <div className="text-sm text-gray-600 ml-6">
                                <p>Criado: {formatDate(promotion.data_vinculo)}</p>
                                {promotion.data_atualizacao_vinculo && (
                                  <p>Atualizado: {formatDate(promotion.data_atualizacao_vinculo)}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {promotion.regras && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">Regras:</span>
                              </div>
                              <div className="text-sm text-gray-600 ml-6 bg-gray-50 p-3 rounded-md">
                                <p className="whitespace-pre-wrap">{promotion.regras}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Erro ao carregar dados das promoções.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserPromotionsModal;