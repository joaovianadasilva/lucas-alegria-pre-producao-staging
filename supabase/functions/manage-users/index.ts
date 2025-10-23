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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Cliente com permissões de serviço (admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Cliente com permissões normais (para validar o usuário atual)
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário é admin
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      console.error('Usuário não é admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem gerenciar usuários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();
    console.log('Action:', action, 'Params:', params);

    switch (action) {
      case 'listUsers': {
        // Buscar todos os perfis
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .order('nome');

        if (profilesError) throw profilesError;

        // Buscar roles de todos os usuários
        const { data: allRoles, error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .select('*');

        if (rolesError) throw rolesError;

        // Combinar perfis com roles
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

        // Criar usuário no auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            nome,
            sobrenome,
            telefone,
          },
        });

        if (authError) throw authError;

        // Criar perfil
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: authData.user.id,
            nome,
            sobrenome,
            email,
            telefone,
            ativo: true,
          });

        if (profileError) throw profileError;

        // Adicionar roles
        if (roles && roles.length > 0) {
          const { error: rolesError } = await supabaseAdmin
            .from('user_roles')
            .insert(
              roles.map((role: string) => ({
                user_id: authData.user.id,
                role,
              }))
            );

          if (rolesError) throw rolesError;
        }

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

        // Buscar status atual
        const { data: profile, error: fetchError } = await supabaseAdmin
          .from('profiles')
          .select('ativo')
          .eq('id', userId)
          .single();

        if (fetchError) throw fetchError;

        // Inverter status
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
