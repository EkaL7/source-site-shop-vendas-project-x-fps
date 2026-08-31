// Verifica se o usuário ainda está no servidor.
// Frontend chama isso em momentos críticos (login, abrir checkout, dashboard)
// e a cada N minutos. Se retornar isMember=false, o frontend faz signOut.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isUserInGuild, getDiscordEnv } from '../_shared/discord.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const env = getDiscordEnv()
  if (!env) {
    return new Response(JSON.stringify({ error: 'Discord não configurado.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Supabase mal configurado.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { userId?: string } = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { userId } = body
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId é obrigatório.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: userResp, error: userErr } = await supabase.auth.admin.getUserById(userId)
  if (userErr || !userResp?.user) {
    return new Response(JSON.stringify({ error: 'Usuário não encontrado.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const meta = (userResp.user.user_metadata ?? {}) as Record<string, unknown>
  const discordUserId =
    (meta.provider_id as string | undefined) ||
    (meta.sub as string | undefined) ||
    ((meta.custom_claims as { provider_id?: string } | undefined)?.provider_id) ||
    null

  if (!discordUserId) {
    return new Response(JSON.stringify({ isMember: false, reason: 'no_discord_id' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const isMember = await isUserInGuild(env, discordUserId)
  return new Response(JSON.stringify({ isMember, discordUserId }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
