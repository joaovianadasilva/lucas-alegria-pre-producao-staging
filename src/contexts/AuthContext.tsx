import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Profile {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  telefone?: string;
  ativo: boolean;
}

interface Provedor {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  ativo: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  provedorAtivo: Provedor | null;
  provedoresDisponiveis: Provedor[];
  provedoresLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isSuperAdmin: () => boolean;
  selecionarProvedor: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);



export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [provedorAtivo, setProvedorAtivo] = useState<Provedor | null>(null);
  const [provedoresDisponiveis, setProvedoresDisponiveis] = useState<Provedor[]>([]);
  const [provedoresLoading, setProvedoresLoading] = useState(true);
  const navigate = useNavigate();
  const initializedRef = useRef(false);

  const fetchProfileAndRoles = async (userId: string) => {
    try {
      // Buscar perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Buscar roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;
      const userRoles = rolesData?.map(r => r.role) || [];
      setRoles(userRoles);

      return userRoles;
    } catch (error) {
      console.error('Erro ao buscar perfil e roles:', error);
      return [];
    }
  };

  const fetchProvedores = async (userId: string, userRoles: string[]) => {
    setProvedoresLoading(true);
    try {
      const isSA = userRoles.includes('super_admin');

      let provedores: Provedor[] = [];

      if (isSA) {
        // Super admin vê todos os provedores ativos
        const { data, error } = await supabase
          .from('provedores')
          .select('*')
          .eq('ativo', true)
          .order('nome');
        if (error) throw error;
        provedores = data || [];
      } else {
        // Buscar provedores vinculados ao usuário
        const { data: links, error: linksError } = await supabase
          .from('usuario_provedores')
          .select('provedor_id')
          .eq('user_id', userId);

        if (linksError) throw linksError;

        if (links && links.length > 0) {
          const ids = links.map(l => l.provedor_id);
          const { data, error } = await supabase
            .from('provedores')
            .select('*')
            .in('id', ids)
            .eq('ativo', true)
            .order('nome');
          if (error) throw error;
          provedores = data || [];
        }
      }

      setProvedoresDisponiveis(provedores);

      // Restaurar provedor do localStorage ou manter seleção atual
      const savedId = localStorage.getItem('provedorAtivoId');
      setProvedorAtivo(prev => {
        if (prev && provedores.some(p => p.id === prev.id)) return prev;
        if (savedId) {
          const saved = provedores.find(p => p.id === savedId);
          if (saved) return saved;
        }
        return provedores.length === 1 ? provedores[0] : null;
      });
    } catch (error) {
      console.error('Erro ao buscar provedores:', error);
    } finally {
      setProvedoresLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRoles([]);
          setProvedorAtivo(null);
          setProvedoresDisponiveis([]);
          setProvedoresLoading(false);
          initializedRef.current = false;
        } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !initializedRef.current) {
          if (currentSession?.user) {
    setTimeout(async () => {
      const userRoles = await fetchProfileAndRoles(currentSession.user.id);
      await fetchProvedores(currentSession.user.id, userRoles);
    }, 0);
  } else {
    setProvedoresLoading(false);
  }
}

        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

  if (currentSession?.user) {
        initializedRef.current = true;
        const userRoles = await fetchProfileAndRoles(currentSession.user.id);
        await fetchProvedores(currentSession.user.id, userRoles);
      } else {
        setProvedoresLoading(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error: any) {
      console.error('Erro no login:', error);
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Por favor, confirme seu email antes de fazer login');
      } else {
        toast.error('Erro ao fazer login: ' + error.message);
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setProfile(null);
      setRoles([]);
      setProvedorAtivo(null);
      setProvedoresDisponiveis([]);
      localStorage.removeItem('provedorAtivoId');
      initializedRef.current = false;
      toast.success('Logout realizado com sucesso!');
      navigate('/auth');
    } catch (error: any) {
      console.error('Erro no logout:', error);
      toast.error('Erro ao fazer logout: ' + error.message);
      throw error;
    }
  };

  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };

  const isSuperAdmin = (): boolean => {
    return roles.includes('super_admin');
  };

  const selecionarProvedor = (id: string) => {
    const provedor = provedoresDisponiveis.find(p => p.id === id);
    if (provedor) {
      setProvedorAtivo(provedor);
      localStorage.setItem('provedorAtivoId', id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        provedorAtivo,
        provedoresDisponiveis,
        provedoresLoading,
        signIn,
        signOut,
        hasRole,
        isSuperAdmin,
        selecionarProvedor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
