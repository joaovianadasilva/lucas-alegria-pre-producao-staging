import { supabase } from '@/integrations/supabase/client';

export interface ItemCatalogo {
  id: string;    // será o 'codigo' do banco
  nome: string;
  valor: number;
}

export const carregarPlanos = async (): Promise<ItemCatalogo[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'listPlanos' }
    });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao carregar planos');
    }

    return data.planos.map((p: any) => ({ 
      id: p.codigo, 
      nome: p.nome, 
      valor: p.valor 
    }));
  } catch (error) {
    console.error('Erro ao carregar planos:', error);
    return [];
  }
};

export const carregarAdicionais = async (): Promise<ItemCatalogo[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'listAdicionais' }
    });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao carregar adicionais');
    }

    return data.adicionais.map((a: any) => ({ 
      id: a.codigo, 
      nome: a.nome, 
      valor: a.valor 
    }));
  } catch (error) {
    console.error('Erro ao carregar adicionais:', error);
    return [];
  }
};

export const salvarPlanos = async (codigo: string, nome: string, valor: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { 
        action: 'addPlano',
        codigo,
        nome,
        valor
      }
    });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao adicionar plano');
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar plano:', error);
    throw error;
  }
};

export const removerPlano = async (codigo: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { 
        action: 'removePlano',
        codigo
      }
    });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao remover plano');
    }

    return true;
  } catch (error) {
    console.error('Erro ao remover plano:', error);
    throw error;
  }
};

export const salvarAdicionais = async (codigo: string, nome: string, valor: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { 
        action: 'addAdicional',
        codigo,
        nome,
        valor
      }
    });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao adicionar adicional');
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar adicional:', error);
    throw error;
  }
};

export const removerAdicional = async (codigo: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { 
        action: 'removeAdicional',
        codigo
      }
    });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao remover adicional');
    }

    return true;
  } catch (error) {
    console.error('Erro ao remover adicional:', error);
    throw error;
  }
};

export const formatarItemCatalogo = (item: ItemCatalogo): string => {
  return `[${item.id}] - [${item.nome}] - [R$ ${item.valor.toFixed(2)}]`;
};

// Interfaces para Cidades e Representantes
export interface ItemCidade {
  id: string;
  nome: string;
  uf: string;
}

export interface ItemRepresentante {
  id: string;
  nome: string;
}

// Carregar cidades (opcional: filtrar por UF)
export const carregarCidades = async (uf?: string): Promise<ItemCidade[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'listCidades', uf }
    });
    
    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao carregar cidades');
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Erro ao carregar cidades:', error);
    return [];
  }
};

// Carregar representantes
export const carregarRepresentantes = async (): Promise<ItemRepresentante[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { action: 'listRepresentantes' }
    });
    
    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao carregar representantes');
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Erro ao carregar representantes:', error);
    return [];
  }
};

export const salvarCidade = async (nome: string, uf: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { 
        action: 'addCidade',
        nome,
        uf
      }
    });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao adicionar cidade');
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar cidade:', error);
    throw error;
  }
};

export const removerCidade = async (id: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { 
        action: 'removeCidade',
        id
      }
    });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao remover cidade');
    }

    return true;
  } catch (error) {
    console.error('Erro ao remover cidade:', error);
    throw error;
  }
};

export const salvarRepresentante = async (nome: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { 
        action: 'addRepresentante',
        nome
      }
    });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao adicionar representante');
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar representante:', error);
    throw error;
  }
};

export const removerRepresentante = async (id: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-catalog', {
      body: { 
        action: 'removeRepresentante',
        id
      }
    });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao remover representante');
    }

    return true;
  } catch (error) {
    console.error('Erro ao remover representante:', error);
    throw error;
  }
};
