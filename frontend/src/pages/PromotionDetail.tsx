import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, Trash2, Calendar, Clock, Target, Users, MessageSquare } from 'lucide-react';
import { usePromotions } from '@/contexts/PromotionContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MeioComunicacao } from '@/types/promotion';
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

const PromotionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getPromotion, deletePromotion } = usePromotions();

  const promotion = id ? getPromotion(id) : undefined;

  if (!promotion) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Promoção não encontrada</h1>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">A promoção solicitada não foi encontrada.</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Voltar às promoções
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDateTime = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusInfo = () => {
    const now = new Date();
    const start = new Date(promotion.dataInicio);
    const end = new Date(promotion.dataFim);

    if (now < start) {
      return { 
        status: 'Agendada', 
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        description: 'Esta promoção ainda não foi iniciada'
      };
    } else if (now >= start && now <= end) {
      return { 
        status: 'Ativa', 
        color: 'bg-success text-success-foreground',
        description: 'Esta promoção está ativa no momento'
      };
    } else {
      return { 
        status: 'Encerrada', 
        color: 'bg-gray-50 text-gray-600 border-gray-200',
        description: 'Esta promoção já foi encerrada'
      };
    }
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
        className={cn("text-sm", colors[meio])}
      >
        {meio}
      </Badge>
    ));
  };

  const statusInfo = getStatusInfo();

  const handleDelete = async () => {
    await deletePromotion(promotion.id);
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{promotion.nomePromocao}</h1>
              <Badge variant="outline" className={statusInfo.color}>
                {statusInfo.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{promotion.brand}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/editar-promocao/${promotion.id}`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
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
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status Alert */}
      <Card className={cn("border-l-4", {
        "border-l-blue-500": statusInfo.status === 'Agendada',
        "border-l-green-500": statusInfo.status === 'Ativa',
        "border-l-gray-400": statusInfo.status === 'Encerrada'
      })}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", {
              "bg-blue-500": statusInfo.status === 'Agendada',
              "bg-green-500": statusInfo.status === 'Ativa',
              "bg-gray-400": statusInfo.status === 'Encerrada'
            })} />
            <p className="font-medium">{statusInfo.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Informações Principais */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Detalhes da Promoção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo</label>
              <p className="text-base">{promotion.tipo}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Saldo</label>
              <p className="text-base">{promotion.saldo}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Base</label>
              <p className="text-base leading-relaxed">{promotion.base}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cronograma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data de Início</label>
              <p className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {formatDateTime(promotion.dataInicio)}
              </p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data de Encerramento</label>
              <p className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {formatDateTime(promotion.dataFim)}
              </p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Duração</label>
              <p className="text-base">
                {Math.ceil((new Date(promotion.dataFim).getTime() - new Date(promotion.dataInicio).getTime()) / (1000 * 60 * 60 * 24))} dias
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meios de Comunicação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Meios de Comunicação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {getCommunicationBadges(promotion.meiosComunicacao)}
          </div>
        </CardContent>
      </Card>

      {/* Segmentos */}
      {promotion.segmentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Segmentos de Público
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {promotion.segmentos.map((segmento, index) => (
              <div key={segmento.id}>
                {index > 0 && <Separator />}
                <div className="space-y-1">
                  <h4 className="font-medium">{segmento.nome}</h4>
                  <p className="text-sm text-muted-foreground">{segmento.descricao}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Metadados */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Criado em: </span>
              {format(new Date(promotion.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
            <div>
              <span className="font-medium">Última atualização: </span>
              {format(new Date(promotion.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromotionDetail;