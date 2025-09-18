import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Plus, X, Calendar as CalendarIcon } from 'lucide-react';
import { usePromotions } from '@/hooks/use-promotions';
import { PromotionFormData, TipoPromocao, TipoSaldo, MeioComunicacao, Segment } from '@/types/promotion';
import { toast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BRANDS = ['7k', 'Cassino', 'VeraBet'];
const TIPOS_PROMOCAO: TipoPromocao[] = ['Cassino', 'Esportivo', 'Ao vivo'];
const TIPOS_SALDO: TipoSaldo[] = ['Real', 'Bônus'];
const MEIOS_COMUNICACAO: MeioComunicacao[] = ['Push', 'Inbox', 'Pop-up', 'E-mail'];

const PromotionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addPromotion, updatePromotion, getPromotion, isLoading } = usePromotions();

  const isEditing = Boolean(id);
  const existingPromotion = isEditing ? getPromotion(id!) : undefined;

  const [formData, setFormData] = useState<PromotionFormData>({
    brand: '',
    nomePromocao: '',
    tipo: 'Cassino',
    dataInicio: '',
    horaInicio: '09:00',
    dataFim: '',
    horaFim: '23:59',
    base: '',
    saldo: 'Real',
    meiosComunicacao: [],
    segmentos: []
  });

  const [newSegment, setNewSegment] = useState({ nome: '', descricao: '' });

  // Preencher formulário para edição
  useEffect(() => {
    if (isEditing && existingPromotion) {
      const startDate = new Date(existingPromotion.dataInicio);
      const endDate = new Date(existingPromotion.dataFim);

      setFormData({
        brand: existingPromotion.brand,
        nomePromocao: existingPromotion.nomePromocao,
        tipo: existingPromotion.tipo,
        dataInicio: startDate.toISOString().split('T')[0],
        horaInicio: startDate.toTimeString().slice(0, 5),
        dataFim: endDate.toISOString().split('T')[0],
        horaFim: endDate.toTimeString().slice(0, 5),
        base: existingPromotion.base,
        saldo: existingPromotion.saldo,
        meiosComunicacao: existingPromotion.meiosComunicacao,
        segmentos: existingPromotion.segmentos
      });
    }
  }, [isEditing, existingPromotion]);

  const handleInputChange = (field: keyof PromotionFormData, value: string | TipoPromocao | TipoSaldo | MeioComunicacao[] | Segment[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCommunicationChange = (meio: MeioComunicacao, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      meiosComunicacao: checked
        ? [...prev.meiosComunicacao, meio]
        : prev.meiosComunicacao.filter(m => m !== meio)
    }));
  };

  const addSegment = () => {
    if (!newSegment.nome.trim() || !newSegment.descricao.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e descrição do segmento.",
        variant: "destructive",
      });
      return;
    }

    const segment: Segment = {
      id: Math.random().toString(36).substr(2, 9),
      nome: newSegment.nome.trim(),
      descricao: newSegment.descricao.trim()
    };

    setFormData(prev => ({
      ...prev,
      segmentos: [...prev.segmentos, segment]
    }));

    setNewSegment({ nome: '', descricao: '' });
  };

  const removeSegment = (segmentId: string) => {
    setFormData(prev => ({
      ...prev,
      segmentos: prev.segmentos.filter(s => s.id !== segmentId)
    }));
  };

  const validateForm = (): boolean => {
    const required = ['brand', 'nomePromocao', 'dataInicio', 'dataFim', 'base'];
    const missing = required.filter(field => !formData[field as keyof PromotionFormData]);

    if (missing.length > 0) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: "Verifique todos os campos obrigatórios.",
        variant: "destructive",
      });
      return false;
    }

    if (new Date(`${formData.dataInicio}T${formData.horaInicio}`) >= new Date(`${formData.dataFim}T${formData.horaFim}`)) {
      toast({
        title: "Datas inválidas",
        description: "A data de fim deve ser posterior à data de início.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.meiosComunicacao.length === 0) {
      toast({
        title: "Meio de comunicação obrigatório",
        description: "Selecione pelo menos um meio de comunicação.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (isEditing && id) {
        await updatePromotion(id, formData);
      } else {
        await addPromotion(formData);
      }
      navigate('/');
    } catch (error) {
      // Error já tratado no contexto
    }
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
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? 'Editar Promoção' : 'Cadastrar Nova Promoção'}
            </h1>
            <p className="text-muted-foreground">
              Preencha as informações da campanha promocional
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <Select
                  value={formData.brand}
                  onValueChange={(value) => handleInputChange('brand', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Selecione a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANDS.map(brand => (
                      <SelectItem key={brand} value={brand}>
                        <div className="flex items-center gap-2">
                          <img
                            src={`/images/logo-${brand.toLowerCase()}.${brand === 'VeraBet' ? 'jpg' : 'png'}`}
                            alt={`Logo ${brand}`}
                            className="w-5 h-5 object-contain"
                          />
                          {brand}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => handleInputChange('tipo', value as TipoPromocao)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PROMOCAO.map(tipo => (
                      <SelectItem key={tipo} value={tipo}>
                        <div className="flex items-center gap-2">
                          <span>
                            {tipo === 'Cassino' ? '🎰' :
                              tipo === 'Esportivo' ? '⚽' :
                                tipo === 'Ao vivo' ? '🎲' : ''}
                          </span>
                          {tipo}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomePromocao">Nome da Promoção / Oferta *</Label>
              <Input
                id="nomePromocao"
                value={formData.nomePromocao}
                onChange={(e) => handleInputChange('nomePromocao', e.target.value)}
                placeholder="Ex: Bônus de Boas-vindas 100%"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="base">Base *</Label>
              <Textarea
                id="base"
                value={formData.base}
                onChange={(e) => handleInputChange('base', e.target.value)}
                placeholder="Descreva as condições da promoção"
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Saldo *</Label>
              <Select
                value={formData.saldo}
                onValueChange={(value) => handleInputChange('saldo', value as TipoSaldo)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_SALDO.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Período */}
        <Card>
          <CardHeader>
            <CardTitle>Período da Promoção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <Label className="text-base font-medium">Data e Hora de Início *</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dataInicio">Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          disabled={isLoading}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dataInicio ? format(new Date(formData.dataInicio + 'T12:00:00'), 'dd/MM/yyyy') : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DayPicker
                          mode="single"
                          selected={formData.dataInicio ? new Date(formData.dataInicio + 'T12:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              // Garantir que a data seja tratada no fuso horário local
                              const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                              handleInputChange('dataInicio', format(localDate, 'yyyy-MM-dd'));
                            }
                          }}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horaInicio">Hora</Label>
                    <Input
                      id="horaInicio"
                      type="time"
                      value={formData.horaInicio}
                      onChange={(e) => handleInputChange('horaInicio', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Data e Hora de Encerramento *</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dataFim">Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          disabled={isLoading}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dataFim ? format(new Date(formData.dataFim + 'T12:00:00'), 'dd/MM/yyyy') : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DayPicker
                          mode="single"
                          selected={formData.dataFim ? new Date(formData.dataFim + 'T12:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              // Garantir que a data seja tratada no fuso horário local
                              const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                              handleInputChange('dataFim', format(localDate, 'yyyy-MM-dd'));
                            }
                          }}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horaFim">Hora</Label>
                    <Input
                      id="horaFim"
                      type="time"
                      value={formData.horaFim}
                      onChange={(e) => handleInputChange('horaFim', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meios de Comunicação */}
        <Card>
          <CardHeader>
            <CardTitle>Meios de Comunicação *</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {MEIOS_COMUNICACAO.map(meio => (
                <div key={meio} className="flex items-center space-x-2">
                  <Checkbox
                    id={meio}
                    checked={formData.meiosComunicacao.includes(meio)}
                    onCheckedChange={(checked) =>
                      handleCommunicationChange(meio, checked as boolean)
                    }
                    disabled={isLoading}
                  />
                  <Label htmlFor={meio} className="font-normal">{meio}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Segmentos */}
        <Card>
          <CardHeader>
            <CardTitle>Segmentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lista de segmentos */}
            {formData.segmentos.length > 0 && (
              <div className="space-y-2">
                <Label>Segmentos Adicionados</Label>
                <div className="space-y-2">
                  {formData.segmentos.map((segmento) => (
                    <div key={segmento.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{segmento.nome}</div>
                        <div className="text-sm text-muted-foreground">{segmento.descricao}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSegment(segmento.id)}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            )}

            {/* Adicionar novo segmento */}
            <div className="space-y-3">
              <Label>Adicionar Novo Segmento</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Nome do segmento"
                  value={newSegment.nome}
                  onChange={(e) => setNewSegment(prev => ({ ...prev, nome: e.target.value }))}
                  disabled={isLoading}
                />
                <Input
                  placeholder="Descrição do segmento"
                  value={newSegment.descricao}
                  onChange={(e) => setNewSegment(prev => ({ ...prev, descricao: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSegment}
                disabled={isLoading || !newSegment.nome.trim() || !newSegment.descricao.trim()}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Segmento
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
            disabled={isLoading}
            className="sm:w-auto w-full"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="sm:w-auto w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? 'Atualizando...' : 'Salvando...'}
              </>
            ) : (
              isEditing ? 'Atualizar Promoção' : 'Salvar Promoção'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PromotionForm;