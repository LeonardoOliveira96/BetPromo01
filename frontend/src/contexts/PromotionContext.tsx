import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Promotion, PromotionFormData, Segment, TipoPromocao } from '@/types/promotion';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@apollo/client/react';
import { CREATE_PROMOTION, GET_PROMOTIONS } from '@/lib/graphql/promotionQueries';
import { ApiPromotion, ApiPromotionInput } from '@/types/apiTypes';

interface PromotionsData {
  promotions: ApiPromotion[];
}

interface CreatePromotionData {
  createPromotion: ApiPromotion;
}

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

  // GraphQL queries and mutations
  const { loading: loadingPromotions, data: promotionsData } = useQuery<PromotionsData>(GET_PROMOTIONS);
  const [createPromotion, { loading: creatingPromotion }] = useMutation(CREATE_PROMOTION);

  // Load promotions from API
  useEffect(() => {
    if (promotionsData?.promotions) {
      // Map API promotions to our frontend format
      const mappedPromotions: Promotion[] = promotionsData.promotions.map((promo: ApiPromotion) => ({
        id: promo.id,
        brand: promo.title.split(' ')[0], // Assuming brand is first word in title
        nomePromocao: promo.title,
        tipo: mapPromotionType(promo.type),
        dataInicio: new Date(promo.startDate),
        dataFim: new Date(promo.endDate),
        base: promo.conditions?.minDeposit?.toString() || '',
        saldo: promo.reward?.type === 'fixed_amount' ? 'Real' : 'Bônus',
        meiosComunicacao: ['E-mail'], // Default value
        segmentos: [], // Default empty
        createdAt: new Date(promo.createdAt),
        updatedAt: new Date(promo.updatedAt)
      }));

      setPromotions(mappedPromotions);
    }
  }, [promotionsData]);

  // Helper function to map promotion types
  const mapPromotionType = (apiType: string): TipoPromocao => {
    const typeMap: { [key: string]: TipoPromocao } = {
      'WELCOME_BONUS': 'Cassino',
      'DEPOSIT_BONUS': 'Esportivo',
      'FREE_BET': 'Ao vivo',
      'CASHBACK': 'Esportes',
      'LOYALTY_REWARD': 'Outros'
    };
    return typeMap[apiType] || 'Outros';
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addPromotion = async (formData: PromotionFormData): Promise<void> => {
    setIsLoading(true);

    try {
      // Map frontend data to API format
      const apiInput = {
        title: formData.nomePromocao,
        description: `Promoção ${formData.tipo} para ${formData.brand}`,
        type: mapTypeToApi(formData.tipo),
        startDate: new Date(`${formData.dataInicio}T${formData.horaInicio}`).toISOString(),
        endDate: new Date(`${formData.dataFim}T${formData.horaFim}`).toISOString(),
        conditions: {
          minDeposit: parseFloat(formData.base) || 0,
          minOdds: 1.5,
          newUsersOnly: false
        },
        reward: {
          type: formData.saldo === 'Real' ? 'FIXED_AMOUNT' : 'PERCENTAGE',
          value: 100,
          currency: 'BRL'
        },
        targetAudience: {
          userRoles: ['USER'],
          countries: ['BR'],
          excludedUsers: []
        },
        priority: 1
      };

      // Save to API
      const result = await createPromotion({
        variables: { input: apiInput }
      }) as { data?: CreatePromotionData };

      if (result.data?.createPromotion) {
        // Create local promotion object with API data
        const apiPromotion = result.data.createPromotion;
        const newPromotion: Promotion = {
          id: apiPromotion.id,
          brand: formData.brand,
          nomePromocao: formData.nomePromocao,
          tipo: formData.tipo,
          dataInicio: new Date(`${formData.dataInicio}T${formData.horaInicio}`),
          dataFim: new Date(`${formData.dataFim}T${formData.horaFim}`),
          base: formData.base,
          saldo: formData.saldo,
          meiosComunicacao: formData.meiosComunicacao,
          segmentos: formData.segmentos,
          createdAt: new Date(apiPromotion.createdAt),
          updatedAt: new Date(apiPromotion.updatedAt)
        };

        setPromotions(prev => [newPromotion, ...prev]);

        toast({
          title: "Promoção salva com sucesso!",
          description: `"${formData.nomePromocao}" foi adicionada ao banco de dados.`,
        });
      }
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao salvar promoção:", error);
      toast({
        title: "Erro ao salvar promoção",
        description: errorMessage || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to map frontend type to API type
  const mapTypeToApi = (frontendType: string) => {
    const typeMap: {[key: string]: string} = {
      'Cassino': 'WELCOME_BONUS',
      'Esportivo': 'DEPOSIT_BONUS',
      'Ao vivo': 'FREE_BET',
      'Esportes': 'CASHBACK',
      'Outros': 'LOYALTY_REWARD'
    };
    return typeMap[frontendType] || 'WELCOME_BONUS';
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