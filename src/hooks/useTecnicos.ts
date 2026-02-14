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

export const useTecnicos = (provedorId?: string) => {
  return useQuery({
    queryKey: ['tecnicos', provedorId],
    enabled: !!provedorId,
    queryFn: async () => {
      if (!provedorId) return [];

      // Buscar user_ids vinculados ao provedor
      const { data: usuarioProvedores, error: upError } = await supabase
        .from('usuario_provedores')
        .select('user_id')
        .eq('provedor_id', provedorId);

      if (upError) throw upError;
      if (!usuarioProvedores || usuarioProvedores.length === 0) return [];

      const userIdsProvedor = usuarioProvedores.map(up => up.user_id);

      // Buscar quais desses são técnicos
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'tecnico')
        .in('user_id', userIdsProvedor);

      if (rolesError) throw rolesError;
      if (!userRoles || userRoles.length === 0) return [];

      const tecnicoIds = userRoles.map(r => r.user_id);

      // Buscar perfis dos técnicos
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', tecnicoIds)
        .eq('ativo', true)
        .order('nome');

      if (profilesError) throw profilesError;
      return profiles as Tecnico[];
    },
  });
};
