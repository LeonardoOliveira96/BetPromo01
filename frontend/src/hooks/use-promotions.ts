import { useContext } from 'react';
import { PromotionContext } from '@/contexts/PromotionContext';

export const usePromotions = () => {
  const context = useContext(PromotionContext);
  if (context === undefined) {
    throw new Error('usePromotions must be used within a PromotionProvider');
  }
  return context;
};