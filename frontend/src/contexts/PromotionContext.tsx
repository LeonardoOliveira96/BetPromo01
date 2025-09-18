import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Promotion, PromotionFormData, Segment } from '@/types/promotion';
import { toast } from '@/hooks/use-toast';

interface PromotionContextType {
  promotions: Promotion[];
  isLoading: boolean;
  addPromotion: (formData: PromotionFormData) => Promise<void>;
  updatePromotion: (id: string, formData: PromotionFormData) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  getPromotion: (id: string) => Promotion | undefined;
}

const PromotionContext = createContext<PromotionContextType | undefined>(undefined);

// Dados mock para demonstração
const mockPromotions: Promotion[] = [
  {
    id: '1',
    brand: 'BetMax',
    nomePromocao: 'Bônus de Boas-vindas 100%',
    tipo: 'Cassino',
    dataInicio: new Date('2024-01-15T10:00:00'),
    dataFim: new Date('2024-02-15T23:59:00'),
    base: 'Primeiro depósito até R$ 500',
    saldo: 'Bônus',
    meiosComunicacao: ['Push', 'E-mail'],
    segmentos: [
      { id: '1', nome: 'Novos Usuários', descricao: 'Usuários cadastrados nos últimos 30 dias' },
      { id: '2', nome: 'High Rollers', descricao: 'Usuários com depósito médio > R$ 1000' }
    ],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  },
  {
    id: '2',
    brand: 'SportsBet',
    nomePromocao: 'Cashback Semanal',
    tipo: 'Esportes',
    dataInicio: new Date('2024-01-20T00:00:00'),
    dataFim: new Date('2024-01-27T23:59:00'),
    base: '10% das perdas até R$ 200',
    saldo: 'Real',
    meiosComunicacao: ['Inbox', 'Pop-up'],
    segmentos: [
      { id: '3', nome: 'Apostadores Ativos', descricao: 'Usuários com pelo menos 5 apostas na semana' }
    ],
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18')
  }
];

export const PromotionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [promotions, setPromotions] = useState<Promotion[]>(mockPromotions);
  const [isLoading, setIsLoading] = useState(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addPromotion = async (formData: PromotionFormData): Promise<void> => {
    setIsLoading(true);
    
    // Simular delay da API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const newPromotion: Promotion = {
        id: generateId(),
        brand: formData.brand,
        nomePromocao: formData.nomePromocao,
        tipo: formData.tipo,
        dataInicio: new Date(`${formData.dataInicio}T${formData.horaInicio}`),
        dataFim: new Date(`${formData.dataFim}T${formData.horaFim}`),
        base: formData.base,
        saldo: formData.saldo,
        meiosComunicacao: formData.meiosComunicacao,
        segmentos: formData.segmentos,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setPromotions(prev => [newPromotion, ...prev]);
      
      toast({
        title: "Promoção criada com sucesso!",
        description: `"${formData.nomePromocao}" foi adicionada à lista.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao criar promoção",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePromotion = async (id: string, formData: PromotionFormData): Promise<void> => {
    setIsLoading(true);
    
    // Simular delay da API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      setPromotions(prev => prev.map(promotion => 
        promotion.id === id 
          ? {
              ...promotion,
              brand: formData.brand,
              nomePromocao: formData.nomePromocao,
              tipo: formData.tipo,
              dataInicio: new Date(`${formData.dataInicio}T${formData.horaInicio}`),
              dataFim: new Date(`${formData.dataFim}T${formData.horaFim}`),
              base: formData.base,
              saldo: formData.saldo,
              meiosComunicacao: formData.meiosComunicacao,
              segmentos: formData.segmentos,
              updatedAt: new Date()
            }
          : promotion
      ));
      
      toast({
        title: "Promoção atualizada!",
        description: `As alterações foram salvas com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar promoção",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deletePromotion = async (id: string): Promise<void> => {
    setIsLoading(true);
    
    // Simular delay da API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      setPromotions(prev => prev.filter(promotion => promotion.id !== id));
      
      toast({
        title: "Promoção removida",
        description: "A promoção foi excluída com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir promoção",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getPromotion = (id: string): Promotion | undefined => {
    return promotions.find(promotion => promotion.id === id);
  };

  return (
    <PromotionContext.Provider value={{
      promotions,
      isLoading,
      addPromotion,
      updatePromotion,
      deletePromotion,
      getPromotion
    }}>
      {children}
    </PromotionContext.Provider>
  );
};

export const usePromotions = () => {
  const context = useContext(PromotionContext);
  if (context === undefined) {
    throw new Error('usePromotions must be used within a PromotionProvider');
  }
  return context;
};