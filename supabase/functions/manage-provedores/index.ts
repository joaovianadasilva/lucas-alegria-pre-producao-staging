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
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();
    console.log('manage-provedores Action:', action);

    // Verificar roles do usuário
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isSuperAdmin = userRoles?.some(r => r.role === 'super_admin');

    switch (action) {
      case 'listProvedores': {
        if (isSuperAdmin) {
          const { data, error } = await supabaseAdmin
            .from('provedores')
            .select('*')
            .order('nome');
          if (error) throw error;
          return new Response(
            JSON.stringify({ success: true, provedores: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          const { data: vinculos, error: vinculoError } = await supabaseAdmin
            .from('usuario_provedores')
            .select('provedor_id')
            .eq('user_id', user.id);

          if (vinculoError) throw vinculoError;

          const provedorIds = vinculos?.map(v => v.provedor_id) || [];
          if (provedorIds.length === 0) {
            return new Response(
              JSON.stringify({ success: true, provedores: [] }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { data, error } = await supabaseAdmin
            .from('provedores')
            .select('*')
            .in('id', provedorIds)
            .eq('ativo', true)
            .order('nome');

          if (error) throw error;
          return new Response(
            JSON.stringify({ success: true, provedores: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'createProvedor': {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Apenas super_admin pode criar provedores' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { nome, logoUrl } = params;
        if (!nome) throw new Error('Nome é obrigatório');

        const generatedSlug = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        const { data, error } = await supabaseAdmin
          .from('provedores')
          .insert({ nome, slug: generatedSlug, logo_url: logoUrl || null })
          .select()
          .single();

        if (error) throw error;

        // Auto-vincular criador ao novo provedor
        await supabaseAdmin
          .from('usuario_provedores')
          .insert({ user_id: user.id, provedor_id: data.id });

        return new Response(
          JSON.stringify({ success: true, provedor: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateProvedor': {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Apenas super_admin pode editar provedores' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { provedorId, nome, slug, logoUrl } = params;
        if (!provedorId) throw new Error('provedorId é obrigatório');

        const updateData: any = {};
        if (nome !== undefined) updateData.nome = nome;
        if (slug !== undefined) updateData.slug = slug;
        if (logoUrl !== undefined) updateData.logo_url = logoUrl;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
          .from('provedores')
          .update(updateData)
          .eq('id', provedorId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, provedor: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggleProvedorStatus': {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Apenas super_admin pode alterar status de provedores' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { provedorId } = params;
        if (!provedorId) throw new Error('provedorId é obrigatório');

        const { data: provedor, error: fetchError } = await supabaseAdmin
          .from('provedores')
          .select('ativo')
          .eq('id', provedorId)
          .single();

        if (fetchError) throw fetchError;

        const { error } = await supabaseAdmin
          .from('provedores')
          .update({ ativo: !provedor.ativo, updated_at: new Date().toISOString() })
          .eq('id', provedorId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, ativo: !provedor.ativo }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listUsuariosProvedor': {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Apenas super_admin pode gerenciar usuários de provedores' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { provedorId } = params;
        if (!provedorId) throw new Error('provedorId é obrigatório');

        const { data: vinculos, error: vinculoError } = await supabaseAdmin
          .from('usuario_provedores')
          .select('user_id')
          .eq('provedor_id', provedorId);

        if (vinculoError) throw vinculoError;

        const userIds = vinculos?.map(v => v.user_id) || [];
        if (userIds.length === 0) {
          return new Response(
            JSON.stringify({ success: true, usuarios: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, nome, sobrenome, email')
          .in('id', userIds)
          .order('nome');

        if (profilesError) throw profilesError;

        return new Response(
          JSON.stringify({ success: true, usuarios: profiles }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listAllUsers': {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Apenas super_admin pode listar todos os usuários' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: profiles, error } = await supabaseAdmin
          .from('profiles')
          .select('id, nome, sobrenome, email')
          .eq('ativo', true)
          .order('nome');

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, usuarios: profiles }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'addUsuarioProvedor': {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Apenas super_admin pode vincular usuários a provedores' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { provedorId, userId } = params;
        if (!provedorId || !userId) throw new Error('provedorId e userId são obrigatórios');

        const { error } = await supabaseAdmin
          .from('usuario_provedores')
          .insert({ user_id: userId, provedor_id: provedorId });

        if (error) {
          if (error.code === '23505') {
            return new Response(
              JSON.stringify({ error: 'Usuário já está vinculado a este provedor' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          throw error;
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removeUsuarioProvedor': {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Apenas super_admin pode desvincular usuários de provedores' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { provedorId, userId } = params;
        if (!provedorId || !userId) throw new Error('provedorId e userId são obrigatórios');

        const { error } = await supabaseAdmin
          .from('usuario_provedores')
          .delete()
          .eq('user_id', userId)
          .eq('provedor_id', provedorId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
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
