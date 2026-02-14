import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook que retorna o provedorId ativo.
 * Lança erro se nenhum provedor estiver selecionado.
 */
export const useProvedorId = (): string => {
  const { provedorAtivo } = useAuth();
  if (!provedorAtivo) {
    throw new Error('Nenhum provedor ativo selecionado');
  }
  return provedorAtivo.id;
};
