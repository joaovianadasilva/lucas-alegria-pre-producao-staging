import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado - Token ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado - Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário é admin ou super_admin
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(r => r.role === 'admin' || r.role === 'super_admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem gerenciar usuários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSuperAdmin = userRoles?.some(r => r.role === 'super_admin');

    const { action, provedorId, ...params } = await req.json();
    console.log('Action:', action, 'ProvedorId:', provedorId, 'Params:', params);

    // provedorId obrigatório para a maioria das ações
    if (!provedorId && action !== 'listProvedoresForUser') {
      throw new Error('provedorId é obrigatório');
    }

    switch (action) {
      case 'listUsers': {
        // Buscar usuários vinculados ao provedor
        const { data: vinculos, error: vinculosError } = await supabaseAdmin
          .from('usuario_provedores')
          .select('user_id')
          .eq('provedor_id', provedorId);

        if (vinculosError) throw vinculosError;

        const userIds = vinculos?.map(v => v.user_id) || [];

        if (userIds.length === 0) {
          return new Response(
            JSON.stringify({ users: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .in('id', userIds)
          .order('nome');

        if (profilesError) throw profilesError;

        const { data: allRoles, error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .select('*')
          .in('user_id', userIds);

        if (rolesError) throw rolesError;

        const usersWithRoles = profiles.map(profile => ({
          ...profile,
          roles: allRoles.filter(r => r.user_id === profile.id).map(r => r.role),
        }));

        return new Response(
          JSON.stringify({ users: usersWithRoles }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createUser': {
        const { email, password, nome, sobrenome, telefone, roles } = params;

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nome, sobrenome, telefone },
        });

        if (authError) {
          if (authError.message.includes('already been registered')) {
            return new Response(
              JSON.stringify({ error: 'Este email já está cadastrado no sistema' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          throw authError;
        }

        // Criar perfil
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authData.user.id,
            nome, sobrenome, email, telefone, ativo: true,
          }, { onConflict: 'id' });

        if (profileError) throw profileError;

        // Adicionar roles
        if (roles && roles.length > 0) {
          const { error: rolesError } = await supabaseAdmin
            .from('user_roles')
            .insert(roles.map((role: string) => ({ user_id: authData.user.id, role })));
          if (rolesError) throw rolesError;
        }

        // Vincular ao provedor
        const { error: vinculoError } = await supabaseAdmin
          .from('usuario_provedores')
          .insert({ user_id: authData.user.id, provedor_id: provedorId });

        if (vinculoError) throw vinculoError;

        return new Response(
          JSON.stringify({ message: 'Usuário criado com sucesso', userId: authData.user.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateUser': {
        const { userId, nome, sobrenome, telefone, ativo } = params;

        const updateData: any = {};
        if (nome !== undefined) updateData.nome = nome;
        if (sobrenome !== undefined) updateData.sobrenome = sobrenome;
        if (telefone !== undefined) updateData.telefone = telefone;
        if (ativo !== undefined) updateData.ativo = ativo;

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', userId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ message: 'Usuário atualizado com sucesso' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'assignRole': {
        const { userId, role } = params;

        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (roleError) throw roleError;

        return new Response(
          JSON.stringify({ message: 'Role atribuída com sucesso' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removeRole': {
        const { userId, role } = params;

        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);

        if (roleError) throw roleError;

        return new Response(
          JSON.stringify({ message: 'Role removida com sucesso' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggleUserStatus': {
        const { userId } = params;

        const { data: profile, error: fetchError } = await supabaseAdmin
          .from('profiles')
          .select('ativo')
          .eq('id', userId)
          .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ ativo: !profile.ativo })
          .eq('id', userId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ message: 'Status do usuário atualizado com sucesso', ativo: !profile.ativo }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'assignProvedor': {
        const { userId, targetProvedorId } = params;
        
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Apenas super_admin pode vincular usuários a provedores' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabaseAdmin
          .from('usuario_provedores')
          .insert({ user_id: userId, provedor_id: targetProvedorId });

        if (error) throw error;

        return new Response(
          JSON.stringify({ message: 'Usuário vinculado ao provedor com sucesso' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removeProvedor': {
        const { userId, targetProvedorId } = params;
        
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Apenas super_admin pode desvincular usuários de provedores' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabaseAdmin
          .from('usuario_provedores')
          .delete()
          .eq('user_id', userId)
          .eq('provedor_id', targetProvedorId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ message: 'Usuário desvinculado do provedor com sucesso' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});