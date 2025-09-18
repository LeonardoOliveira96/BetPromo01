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

// eslint-disable-next-line react-refresh/only-export-components
export const PromotionContext = createContext<PromotionContextType | undefined>(undefined);

export const PromotionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addPromotion = async (formData: PromotionFormData): Promise<void> => {
    setIsLoading(true);

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

// Hook movido para /hooks/use-promotions.ts