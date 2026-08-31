/**
 * Edge Function: ahk-auth
 *
 * Handles all desktop-app authentication:
 *   POST  { action: "validate_key",    key, hwid }
 *   POST  { action: "validate_session", token, hwid }
 *   POST  { action: "create_discord_session", hwid }
 *   POST  { action: "check_discord_session",  nonce }
 *   POST  { action: "admin_create_key", adminSecret, type, expiresInDays, label }
 *   POST  { action: "admin_list_keys",  adminSecret }
 *   POST  { action: "admin_revoke_key", adminSecret, key }
 *   POST  { action: "admin_reset_hwid", adminSecret, key }
 *   GET   ?callback=1&code=...&state=NONCE  (Discord OAuth callback)
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isUserInGuild, getDiscordEnv } from '../_shared/discord.ts'
import { corsHeaders } from '../_shared/cors.ts'

// ─── helpers ──────────────────────────────────────────────────────────
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function html(body: string, status = 200) {
  const h = new Headers()
  h.set('Content-Type', 'text/html; charset=utf-8')
  h.set('Cache-Control', 'no-store')
  h.set('Access-Control-Allow-Origin', '*')
  return new Response(body, { status, headers: h })
}

function getSupabase(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

function randomToken(len = 48): string {
  const buf = new Uint8Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ─── main ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)

  // GET = Discord OAuth callback or result page
  if (req.method === 'GET') {
    if (url.searchParams.has('code')) return handleDiscordCallback(url)
    return json({ error: 'Method not allowed' }, 405)
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {
    return json({ error: 'JSON inválido' }, 400)
  }

  switch (body.action as string) {
    case 'validate_key':           return validateKey(body)
    case 'validate_session':       return validateSession(body)
    case 'create_discord_session': return createDiscordSession(body, url)
    case 'check_discord_session':  return checkDiscordSession(body)
    case 'admin_create_key':       return adminCreateKey(body)
    case 'admin_list_keys':        return adminListKeys(body)
    case 'admin_revoke_key':       return adminRevokeKey(body)
    case 'admin_reset_hwid':       return adminResetHwid(body)
    case 'admin_setup_callback':   return adminSetupCallback(body)
    default:                       return json({ error: 'Ação desconhecida' }, 400)
  }
})

// ══════════════════════════════════════════════════════════════════════
//   validate_key  —  primary auth: license key + HWID
// ══════════════════════════════════════════════════════════════════════
async function validateKey(body: Record<string, unknown>) {
  const key  = (body.key  as string || '').trim()
  const hwid = (body.hwid as string || '').trim()
  if (!key || !hwid) return json({ valid: false, reason: 'missing_fields' })

  const sb = getSupabase()
  const { data: lic, error } = await sb
    .from('licenses').select('*').eq('key', key).maybeSingle()

  if (error || !lic)     return json({ valid: false, reason: 'key_not_found' })
  if (!lic.is_active)    return json({ valid: false, reason: 'key_disabled' })
  if (lic.expires_at && new Date(lic.expires_at) < new Date())
    return json({ valid: false, reason: 'key_expired' })

  // HWID binding
  if (lic.hwid && lic.hwid !== hwid) {
    return json({ valid: false, reason: 'hwid_mismatch' })
  }
  if (!lic.hwid) {
    await sb.from('licenses').update({
      hwid,
      activated_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }).eq('id', lic.id)
  }

  // Optional Discord membership check
  const env = getDiscordEnv()
  if (env && lic.discord_user_id) {
    const meta = await getDiscordIdFromSupabaseUser(sb, lic.discord_user_id)
    if (meta) {
      const inGuild = await isUserInGuild(env, meta)
      if (!inGuild) return json({ valid: false, reason: 'not_in_guild' })
    }
  }

  // Create / refresh persistent session token
  const sessionToken = randomToken()
  await sb.from('ahk_sessions').insert({
    token: sessionToken, license_id: lic.id, hwid,
  })

  return json({
    valid: true,
    sessionToken,
    username: lic.label || lic.discord_username || 'Usuário',
    type: lic.type,
    expiresAt: lic.expires_at,
  })
}

// ══════════════════════════════════════════════════════════════════════
//   validate_session  —  re-check from saved token
// ══════════════════════════════════════════════════════════════════════
async function validateSession(body: Record<string, unknown>) {
  const token = (body.token as string || '').trim()
  const hwid  = (body.hwid  as string || '').trim()
  if (!token || !hwid) return json({ valid: false, reason: 'missing_fields' })

  const sb = getSupabase()
  const { data: sess } = await sb
    .from('ahk_sessions').select('*, licenses(*)').eq('token', token).maybeSingle()

  if (!sess || !sess.is_valid)            return json({ valid: false, reason: 'session_invalid' })
  if (sess.hwid !== hwid)                 return json({ valid: false, reason: 'hwid_mismatch' })

  const lic = (sess as any).licenses
  if (!lic || !lic.is_active)             return json({ valid: false, reason: 'key_disabled' })
  if (lic.expires_at && new Date(lic.expires_at) < new Date())
    return json({ valid: false, reason: 'key_expired' })

  // Touch last_validated_at
  await sb.from('ahk_sessions').update({
    last_validated_at: new Date().toISOString(),
  }).eq('id', sess.id)

  return json({
    valid: true,
    username: lic.label || lic.discord_username || 'Usuário',
    type: lic.type,
    expiresAt: lic.expires_at,
  })
}

// ══════════════════════════════════════════════════════════════════════
//   Discord OAuth — polling flow for desktop apps
// ══════════════════════════════════════════════════════════════════════
async function createDiscordSession(body: Record<string, unknown>, reqUrl: URL) {
  const hwid = (body.hwid as string || '').trim()
  if (!hwid) return json({ error: 'hwid obrigatório' }, 400)

  const clientId = Deno.env.get('DISCORD_CLIENT_ID')
  if (!clientId) return json({ error: 'DISCORD_CLIENT_ID não configurado' }, 500)

  const nonce = randomToken(24)
  const sb = getSupabase()
  await sb.from('ahk_discord_sessions').insert({ nonce, hwid })

  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ahk-auth`
  const authUrl = 'https://discord.com/api/oauth2/authorize'
    + `?client_id=${clientId}`
    + `&redirect_uri=${encodeURIComponent(redirectUri)}`
    + '&response_type=code'
    + '&scope=identify%20guilds'
    + `&state=${nonce}`

  return json({ nonce, authUrl })
}

async function checkDiscordSession(body: Record<string, unknown>) {
  const nonce = (body.nonce as string || '').trim()
  if (!nonce) return json({ error: 'nonce obrigatório' }, 400)

  const sb = getSupabase()
  const { data: sess } = await sb
    .from('ahk_discord_sessions')
    .select('*, licenses(*)')
    .eq('nonce', nonce)
    .maybeSingle()

  if (!sess) return json({ status: 'not_found' })
  if (new Date(sess.expires_at) < new Date()) return json({ status: 'expired' })
  if (sess.status === 'pending') return json({ status: 'pending' })

  const lic = (sess as any).licenses
  if (!lic) return json({ status: 'no_license', discordUsername: sess.discord_username })

  // Create persistent session token
  const sessionToken = randomToken()
  await sb.from('ahk_sessions').insert({
    token: sessionToken, license_id: lic.id, hwid: sess.hwid,
  })

  return json({
    status: 'authenticated',
    sessionToken,
    username: lic.label || sess.discord_username || 'Usuário',
    type: lic.type,
    expiresAt: lic.expires_at,
  })
}

async function handleDiscordCallback(url: URL) {
  const code  = url.searchParams.get('code')
  const nonce = url.searchParams.get('state')
  if (!code || !nonce) return html('<h2>Parâmetros inválidos.</h2>', 400)

  const clientId     = Deno.env.get('DISCORD_CLIENT_ID')!
  const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET')!
  const redirectUri  = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ahk-auth`

  // Exchange code for access_token
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })
  if (!tokenRes.ok) return html('<h2>Erro ao trocar código OAuth.</h2>', 502)
  const tokenData = await tokenRes.json() as { access_token: string }

  // Get Discord user info
  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  if (!userRes.ok) return html('<h2>Erro ao obter dados do Discord.</h2>', 502)
  const discordUser = await userRes.json() as { id: string; username: string; avatar: string }

  // Check guild membership via bot
  const env = getDiscordEnv()
  let inGuild = true
  if (env) {
    inGuild = await isUserInGuild(env, discordUser.id)
  }

  const sb = getSupabase()

  // Find the pending session
  const { data: sess } = await sb
    .from('ahk_discord_sessions')
    .select('*')
    .eq('nonce', nonce)
    .eq('status', 'pending')
    .maybeSingle()

  if (!sess) return html('<h2>Sessão expirada ou inválida.</h2>', 400)

  // Try to find an existing license for this Discord user
  const { data: lic } = await sb
    .from('licenses')
    .select('*')
    .eq('discord_user_id', discordUser.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // If license exists, bind HWID if not bound yet
  if (lic && !lic.hwid) {
    await sb.from('licenses').update({
      hwid: sess.hwid,
      activated_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }).eq('id', lic.id)
  }

  // Check HWID match if license already bound
  let hwidOk = true
  if (lic && lic.hwid && lic.hwid !== sess.hwid) hwidOk = false

  // Update session
  await sb.from('ahk_discord_sessions').update({
    status: 'authenticated',
    discord_id: discordUser.id,
    discord_username: discordUser.username,
    discord_avatar: discordUser.avatar,
    license_id: lic?.id ?? null,
  }).eq('id', sess.id)

  const ok = inGuild && lic && hwidOk
    && lic.is_active
    && (!lic.expires_at || new Date(lic.expires_at) > new Date())

  const errorMsg = !inGuild
    ? 'Voce nao esta no servidor Discord.'
    : !lic
    ? 'Nenhuma licenca encontrada para este Discord.'
    : !hwidOk
    ? 'HWID nao corresponde a licenca.'
    : 'Licenca expirada ou desativada.'

  // Redirect to callback page hosted on Supabase Storage
  const storageBase = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/static`
  const params = new URLSearchParams({
    ok: ok ? '1' : '0',
    u: discordUser.username,
    uid: discordUser.id,
    av: discordUser.avatar || '',
    e: ok ? '' : errorMsg,
  })
  return new Response(null, {
    status: 302,
    headers: { Location: `${storageBase}/auth-callback.html?${params}` },
  })
}

// ══════════════════════════════════════════════════════════════════════
//   Admin helpers
// ══════════════════════════════════════════════════════════════════════
function checkAdmin(body: Record<string, unknown>): boolean {
  const secret = Deno.env.get('AHK_ADMIN_SECRET')
  return !!secret && body.adminSecret === secret
}

async function adminCreateKey(body: Record<string, unknown>) {
  if (!checkAdmin(body)) return json({ error: 'Não autorizado' }, 401)

  const type   = (body.type as string) || 'temporary'
  const days   = Number(body.expiresInDays) || 30
  const label  = (body.label as string) || null
  const discordUserId = (body.discordUserId as string) || null

  const key = 'KITTY-' + randomToken(16).toUpperCase().replace(/(.{4})/g, '$1-').slice(0, -1)
  const expiresAt = type === 'permanent' ? null : new Date(Date.now() + days * 86400000).toISOString()

  const sb = getSupabase()
  const { data, error } = await sb.from('licenses').insert({
    key, label, type,
    discord_user_id: discordUserId,
    expires_at: expiresAt,
  }).select().single()

  if (error) return json({ error: error.message }, 500)
  return json({ ok: true, license: data })
}

async function adminListKeys(body: Record<string, unknown>) {
  if (!checkAdmin(body)) return json({ error: 'Não autorizado' }, 401)
  const sb = getSupabase()
  const { data, error } = await sb
    .from('licenses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return json({ error: error.message }, 500)
  return json({ licenses: data })
}

async function adminRevokeKey(body: Record<string, unknown>) {
  if (!checkAdmin(body)) return json({ error: 'Não autorizado' }, 401)
  const key = body.key as string
  if (!key) return json({ error: 'key obrigatório' }, 400)

  const sb = getSupabase()
  const { error } = await sb.from('licenses')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('key', key)

  if (error) return json({ error: error.message }, 500)

  // Invalidate all sessions for this key
  const { data: lic } = await sb.from('licenses').select('id').eq('key', key).maybeSingle()
  if (lic) {
    await sb.from('ahk_sessions').update({ is_valid: false }).eq('license_id', lic.id)
  }

  return json({ ok: true })
}

async function adminResetHwid(body: Record<string, unknown>) {
  if (!checkAdmin(body)) return json({ error: 'Não autorizado' }, 401)
  const key = body.key as string
  if (!key) return json({ error: 'key obrigatório' }, 400)

  const sb = getSupabase()
  const { data: lic } = await sb.from('licenses').select('*').eq('key', key).maybeSingle()
  if (!lic) return json({ error: 'Chave não encontrada' }, 404)

  if (lic.hwid_resets_used >= lic.max_hwid_resets) {
    return json({ error: 'Limite de resets de HWID atingido' }, 400)
  }

  await sb.from('licenses').update({
    hwid: null,
    hwid_resets_used: lic.hwid_resets_used + 1,
    updated_at: new Date().toISOString(),
  }).eq('id', lic.id)

  // Invalidate sessions
  await sb.from('ahk_sessions').update({ is_valid: false }).eq('license_id', lic.id)

  return json({ ok: true, resetsRemaining: lic.max_hwid_resets - lic.hwid_resets_used - 1 })
}

async function adminSetupCallback(body: Record<string, unknown>) {
  if (!checkAdmin(body)) return json({ error: 'Não autorizado' }, 401)

  const callbackHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KittyFPS Auth</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:#0a0a14;font-family:'Segoe UI',system-ui,sans-serif;overflow:hidden}
body::before{content:'';position:fixed;inset:0;
  background:radial-gradient(ellipse at 30% 20%,rgba(224,64,251,.08) 0%,transparent 60%),
             radial-gradient(ellipse at 70% 80%,rgba(0,229,255,.06) 0%,transparent 50%);
  pointer-events:none}
.card{position:relative;background:linear-gradient(145deg,#141428,#1a1a36);
  border:1px solid rgba(224,64,251,.15);border-radius:20px;padding:48px 56px;
  max-width:440px;width:90%;text-align:center;
  box-shadow:0 0 80px rgba(224,64,251,.1),0 20px 60px rgba(0,0,0,.4)}
.card::before{content:'';position:absolute;top:-1px;left:20%;right:20%;height:2px;
  background:linear-gradient(90deg,transparent,#E040FB,transparent);border-radius:2px}
h1{font-size:22px;font-weight:800;letter-spacing:1px;margin:12px 0 24px;
  background:linear-gradient(135deg,#E040FB,#00E5FF);-webkit-background-clip:text;
  -webkit-text-fill-color:transparent;background-clip:text}
.avatar{width:64px;height:64px;border-radius:50%;border:3px solid #E040FB;
  margin:0 auto 12px;display:block;box-shadow:0 0 20px rgba(224,64,251,.3)}
.username{font-size:18px;font-weight:700;color:#f0f0ff}
.badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;
  font-weight:700;letter-spacing:.5px;margin-top:8px}
.badge-ok{background:rgba(87,242,135,.12);color:#57F287;border:1px solid rgba(87,242,135,.25)}
.badge-fail{background:rgba(255,68,102,.1);color:#FF4466;border:1px solid rgba(255,68,102,.2)}
.msg{font-size:15px;color:#b9bac8;margin-top:16px;line-height:1.5}
.hint{font-size:12px;color:#44446a;margin-top:24px;letter-spacing:.3px}
.glow-ok{animation:pulseOk 2s infinite}
.glow-fail{animation:pulseFail 2s infinite}
@keyframes pulseOk{0%,100%{box-shadow:0 0 80px rgba(87,242,135,.08)}50%{box-shadow:0 0 80px rgba(87,242,135,.2)}}
@keyframes pulseFail{0%,100%{box-shadow:0 0 80px rgba(255,68,102,.08)}50%{box-shadow:0 0 80px rgba(255,68,102,.18)}}
</style>
</head>
<body>
<div class="card" id="c"></div>
<script>
var p=new URLSearchParams(location.search);
var ok=p.get('ok')==='1',u=p.get('u')||'',uid=p.get('uid')||'',av=p.get('av')||'',e=p.get('e')||'';
var c=document.getElementById('c');
if(ok){
  c.className='card glow-ok';
  c.innerHTML='<div style="font-size:40px">\\ud83d\\udc31</div><h1>KITTYFPS</h1>'
    +(av?'<img class="avatar" src="https://cdn.discordapp.com/avatars/'+uid+'/'+av+'.png?size=128" alt="">':'')
    +'<div class="username">'+u+'</div>'
    +'<div class="badge badge-ok">AUTENTICADO</div>'
    +'<p class="msg">Login realizado com sucesso!<br>Seu acesso foi liberado.</p>';
}else{
  c.className='card glow-fail';
  c.innerHTML='<div style="font-size:40px">\\ud83d\\udc31</div><h1>KITTYFPS</h1>'
    +'<div style="font-size:32px">\\u274c</div>'
    +'<div class="badge badge-fail">ACESSO NEGADO</div>'
    +'<p class="msg">'+e+'</p>';
}
c.innerHTML+='<p class="hint">Pode fechar esta aba e voltar ao KittyFPS.</p>';
</script>
</body>
</html>`

  const sb = getSupabase()
  const blob = new Blob([callbackHtml], { type: 'text/html; charset=utf-8' })
  const { error } = await sb.storage
    .from('static')
    .upload('auth-callback.html', blob, {
      contentType: 'text/html; charset=utf-8',
      upsert: true,
    })

  if (error) return json({ error: error.message }, 500)

  const { data } = sb.storage.from('static').getPublicUrl('auth-callback.html')
  return json({ ok: true, url: data.publicUrl })
}

// ─── util ─────────────────────────────────────────────────────────────
async function getDiscordIdFromSupabaseUser(
  sb: SupabaseClient,
  supabaseUserId: string,
): Promise<string | null> {
  const { data } = await sb.auth.admin.getUserById(supabaseUserId)
  if (!data?.user) return null
  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>
  return (
    (meta.provider_id as string) ||
    (meta.sub as string) ||
    ((meta.custom_claims as { provider_id?: string })?.provider_id) ||
    null
  )
}
