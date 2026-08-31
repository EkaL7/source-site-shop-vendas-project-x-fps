// Recebe o user_id do Supabase + provider_token (Discord OAuth access_token)
// e adiciona o usuário ao servidor configurado em DISCORD_GUILD_ID.
// Requer que o usuário tenha autorizado o scope `guilds.join`.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { addUserToGuild, getDiscordEnv } from '../_shared/discord.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const env = getDiscordEnv()
  if (!env) {
    return new Response(JSON.stringify({ error: 'Discord não configurado no backend.' }), {
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

  let body: { providerToken?: string; userId?: string } = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { providerToken, userId } = body
  if (!providerToken || !userId) {
    return new Response(JSON.stringify({ error: 'providerToken e userId são obrigatórios.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Busca o Discord user ID a partir do auth.users (provider_id no user_metadata).
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
    return new Response(
      JSON.stringify({ error: 'Discord user ID não encontrado nos metadados do usuário.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const result = await addUserToGuild(env, discordUserId, providerToken)
  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: 'Falha ao adicionar ao servidor.', details: result }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ ok: true, alreadyInGuild: result.status === 204, discordUserId }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
