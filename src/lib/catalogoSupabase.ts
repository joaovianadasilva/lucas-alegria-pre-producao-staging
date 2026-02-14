import { supabase } from '@/integrations/supabase/client';

export interface ItemCatalogo {
  id: string;
  nome: string;
  valor: number;
  requerAgendamento?: boolean;
}

export const carregarPlanos = async (provedorId: string): Promise<ItemCatalogo[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'listPlanos', provedorId }
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao carregar planos');

    return data.planos.map((p: any) => ({ id: p.codigo, nome: p.nome, valor: p.valor }));
  } catch (error) {
    console.error('Erro ao carregar planos:', error);
    return [];
  }
};

export const carregarAdicionais = async (provedorId: string): Promise<ItemCatalogo[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'listAdicionais', provedorId }
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao carregar adicionais');

    return data.adicionais.map((a: any) => ({ 
      id: a.codigo, nome: a.nome, valor: a.valor,
      requerAgendamento: a.requer_agendamento || false
    }));
  } catch (error) {
    console.error('Erro ao carregar adicionais:', error);
    return [];
  }
};

export const salvarPlanos = async (provedorId: string, codigo: string, nome: string, valor: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'addPlano', provedorId, codigo, nome, valor }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao adicionar plano');
    return true;
  } catch (error) {
    console.error('Erro ao salvar plano:', error);
    throw error;
  }
};

export const removerPlano = async (provedorId: string, codigo: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'removePlano', provedorId, codigo }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao remover plano');
    return true;
  } catch (error) {
    console.error('Erro ao remover plano:', error);
    throw error;
  }
};

export const salvarAdicionais = async (provedorId: string, codigo: string, nome: string, valor: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'addAdicional', provedorId, codigo, nome, valor }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao adicionar adicional');
    return true;
  } catch (error) {
    console.error('Erro ao salvar adicional:', error);
    throw error;
  }
};

export const removerAdicional = async (provedorId: string, codigo: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'removeAdicional', provedorId, codigo }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao remover adicional');
    return true;
  } catch (error) {
    console.error('Erro ao remover adicional:', error);
    throw error;
  }
};

export const formatarItemCatalogo = (item: ItemCatalogo): string => {
  return `[${item.id}] - [${item.nome}] - [R$ ${item.valor.toFixed(2)}]`;
};

export interface ItemCidade { id: string; nome: string; uf: string; }
export interface ItemRepresentante { id: string; nome: string; }
export interface ItemOrigem { id: string; nome: string; }

export const carregarCidades = async (provedorId: string, uf?: string): Promise<ItemCidade[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'listCidades', provedorId, uf }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao carregar cidades');
    return data.data || [];
  } catch (error) {
    console.error('Erro ao carregar cidades:', error);
    return [];
  }
};

export const carregarRepresentantes = async (provedorId: string): Promise<ItemRepresentante[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'listRepresentantes', provedorId }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao carregar representantes');
    return data.data || [];
  } catch (error) {
    console.error('Erro ao carregar representantes:', error);
    return [];
  }
};

export const salvarCidade = async (provedorId: string, nome: string, uf: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'addCidade', provedorId, nome, uf }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao adicionar cidade');
    return true;
  } catch (error) {
    console.error('Erro ao salvar cidade:', error);
    throw error;
  }
};

export const removerCidade = async (provedorId: string, id: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'removeCidade', provedorId, id }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao remover cidade');
    return true;
  } catch (error) {
    console.error('Erro ao remover cidade:', error);
    throw error;
  }
};

export const salvarRepresentante = async (provedorId: string, nome: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'addRepresentante', provedorId, nome }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao adicionar representante');
    return true;
  } catch (error) {
    console.error('Erro ao salvar representante:', error);
    throw error;
  }
};

export const removerRepresentante = async (provedorId: string, id: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'removeRepresentante', provedorId, id }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao remover representante');
    return true;
  } catch (error) {
    console.error('Erro ao remover representante:', error);
    throw error;
  }
};

export const carregarOrigens = async (provedorId: string): Promise<ItemOrigem[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'listOrigens', provedorId }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro ao carregar origens');
    return data.data || [];
  } catch (error) {
    console.error('Erro ao carregar origens:', error);
    return [];
  }
};
