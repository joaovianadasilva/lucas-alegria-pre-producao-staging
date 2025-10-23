import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Tecnico {
  id: string;
  nome: string;
  sobrenome: string;
  telefone?: string;
  email: string;
  ativo: boolean;
}

export const useTecnicos = () => {
  return useQuery({
    queryKey: ['tecnicos'],
    queryFn: async () => {
      console.log('Buscando técnicos...');
      
      // Buscar perfis que têm o role 'tecnico'
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'tecnico');

      if (rolesError) {
        console.error('Erro ao buscar roles:', rolesError);
        throw rolesError;
      }

      if (!userRoles || userRoles.length === 0) {
        console.log('Nenhum técnico encontrado');
        return [];
      }

      const tecnicoIds = userRoles.map(r => r.user_id);
      
      // Buscar perfis dos técnicos
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', tecnicoIds)
        .eq('ativo', true)
        .order('nome');

      if (profilesError) {
        console.error('Erro ao buscar perfis:', profilesError);
        throw profilesError;
      }

      console.log(`${profiles?.length || 0} técnicos encontrados`);
      return profiles as Tecnico[];
    },
  });
};
