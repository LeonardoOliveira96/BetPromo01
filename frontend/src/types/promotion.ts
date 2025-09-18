export interface Segment {
  id: string;
  nome: string;
  descricao: string;
}

export type TipoPromocao = 'Cassino' | 'Esportivo' | 'Ao vivo' | 'Esportes' | 'Poker' | 'Bingo' | 'Outros';

export type TipoSaldo = 'Real' | 'Bônus';

export type MeioComunicacao = 'Push' | 'Inbox' | 'Pop-up' | 'E-mail';

export interface Promotion {
  id: string;
  brand: string;
  nomePromocao: string;
  tipo: TipoPromocao;
  dataInicio: Date;
  dataFim: Date;
  base: string;
  saldo: TipoSaldo;
  meiosComunicacao: MeioComunicacao[];
  segmentos: Segment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionFormData {
  brand: string;
  nomePromocao: string;
  tipo: TipoPromocao;
  dataInicio: string;
  horaInicio: string;
  dataFim: string;
  horaFim: string;
  base: string;
  saldo: TipoSaldo;
  meiosComunicacao: MeioComunicacao[];
  segmentos: Segment[];
}