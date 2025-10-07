export interface ItemCatalogo {
  id: string;
  nome: string;
  valor: number;
}

const PLANOS_KEY = 'catalogo_planos';
const ADICIONAIS_KEY = 'catalogo_adicionais';

const PLANOS_INICIAIS: ItemCatalogo[] = [
  { id: "10001", nome: "Fibra 100MB", valor: 79.90 },
  { id: "10002", nome: "Fibra 200MB", valor: 99.90 },
  { id: "10003", nome: "Fibra 500MB", valor: 149.90 },
];

const ADICIONAIS_INICIAIS: ItemCatalogo[] = [
  { id: "20001", nome: "IP Fixo", valor: 15.00 },
  { id: "20002", nome: "Wi-Fi Premium", valor: 10.00 },
];

export const carregarPlanos = (): ItemCatalogo[] => {
  const stored = localStorage.getItem(PLANOS_KEY);
  if (!stored) {
    localStorage.setItem(PLANOS_KEY, JSON.stringify(PLANOS_INICIAIS));
    return PLANOS_INICIAIS;
  }
  return JSON.parse(stored);
};

export const salvarPlanos = (planos: ItemCatalogo[]): void => {
  localStorage.setItem(PLANOS_KEY, JSON.stringify(planos));
};

export const carregarAdicionais = (): ItemCatalogo[] => {
  const stored = localStorage.getItem(ADICIONAIS_KEY);
  if (!stored) {
    localStorage.setItem(ADICIONAIS_KEY, JSON.stringify(ADICIONAIS_INICIAIS));
    return ADICIONAIS_INICIAIS;
  }
  return JSON.parse(stored);
};

export const salvarAdicionais = (adicionais: ItemCatalogo[]): void => {
  localStorage.setItem(ADICIONAIS_KEY, JSON.stringify(adicionais));
};

export const formatarItemCatalogo = (item: ItemCatalogo): string => {
  return `[${item.id}] - ${item.nome} - R$ ${item.valor.toFixed(2)}`;
};
