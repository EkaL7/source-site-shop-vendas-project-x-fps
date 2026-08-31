// Discord API helper — usado pelas Edge Functions stripe-webhook,
// discord-add-to-guild e discord-check-membership.

const DISCORD_API = 'https://discord.com/api/v10'

export type DiscordEnv = {
  botToken: string
  guildId: string
  ticketChannelId: string
  supportRoleId: string
  customerRoleId: string
}

export function getDiscordEnv(): DiscordEnv | null {
  const botToken = Deno.env.get('DISCORD_BOT_TOKEN')
  const guildId = Deno.env.get('DISCORD_GUILD_ID')
  const ticketChannelId = Deno.env.get('DISCORD_TICKET_CHANNEL_ID')
  const supportRoleId = Deno.env.get('DISCORD_SUPPORT_ROLE_ID')
  const customerRoleId = Deno.env.get('DISCORD_CUSTOMER_ROLE_ID')
  if (!botToken || !guildId || !ticketChannelId || !supportRoleId || !customerRoleId) {
    return null
  }
  return { botToken, guildId, ticketChannelId, supportRoleId, customerRoleId }
}

function authHeaders(botToken: string): HeadersInit {
  return {
    Authorization: `Bot ${botToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'KittyFPS (https://kittyfps.com, 1.0)',
  }
}

/**
 * Adiciona um usuário ao servidor via OAuth2 access_token.
 * Requer que o usuário tenha autorizado o scope `guilds.join`.
 * 201 = adicionado agora · 204 = já estava no server · 4xx = erro
 */
export async function addUserToGuild(
  env: DiscordEnv,
  discordUserId: string,
  oauthAccessToken: string,
): Promise<{ ok: boolean; status: number; body?: unknown }> {
  const res = await fetch(`${DISCORD_API}/guilds/${env.guildId}/members/${discordUserId}`, {
    method: 'PUT',
    headers: authHeaders(env.botToken),
    body: JSON.stringify({ access_token: oauthAccessToken }),
  })
  if (res.status === 204 || res.status === 201) return { ok: true, status: res.status }
  const body = await res.json().catch(() => null)
  return { ok: false, status: res.status, body }
}

/** Retorna true se o usuário está no servidor. */
export async function isUserInGuild(env: DiscordEnv, discordUserId: string): Promise<boolean> {
  const res = await fetch(`${DISCORD_API}/guilds/${env.guildId}/members/${discordUserId}`, {
    method: 'GET',
    headers: authHeaders(env.botToken),
  })
  return res.status === 200
}

/** Atribui um cargo ao usuário. Idempotente — se já tem o cargo, Discord retorna 204. */
export async function assignRole(
  env: DiscordEnv,
  discordUserId: string,
  roleId: string,
): Promise<{ ok: boolean; status: number; body?: unknown }> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${env.guildId}/members/${discordUserId}/roles/${roleId}`,
    { method: 'PUT', headers: authHeaders(env.botToken) },
  )
  if (res.ok) return { ok: true, status: res.status }
  const body = await res.json().catch(() => null)
  return { ok: false, status: res.status, body }
}

/**
 * Cria um thread privado no canal de tickets.
 * type 12 = PRIVATE_THREAD (só convidados conseguem ver)
 */
export async function createPrivateThread(
  env: DiscordEnv,
  name: string,
): Promise<{ ok: boolean; threadId?: string; status: number; body?: unknown }> {
  const res = await fetch(`${DISCORD_API}/channels/${env.ticketChannelId}/threads`, {
    method: 'POST',
    headers: authHeaders(env.botToken),
    body: JSON.stringify({
      name: name.slice(0, 100),
      type: 12,
      auto_archive_duration: 1440, // 24h
      invitable: false, // só admins conseguem convidar mais gente
    }),
  })
  const body = await res.json().catch(() => null) as { id?: string } | null
  if (res.ok && body?.id) return { ok: true, threadId: body.id, status: res.status }
  return { ok: false, status: res.status, body }
}

/** Adiciona um usuário a um thread privado. */
export async function addUserToThread(
  env: DiscordEnv,
  threadId: string,
  discordUserId: string,
): Promise<{ ok: boolean; status: number; body?: unknown }> {
  const res = await fetch(`${DISCORD_API}/channels/${threadId}/thread-members/${discordUserId}`, {
    method: 'PUT',
    headers: authHeaders(env.botToken),
  })
  if (res.ok) return { ok: true, status: res.status }
  const body = await res.json().catch(() => null)
  return { ok: false, status: res.status, body }
}

/** Posta uma mensagem em um canal/thread. */
export async function postMessage(
  env: DiscordEnv,
  channelOrThreadId: string,
  content: string,
  mentionRoleIds: string[] = [],
): Promise<{ ok: boolean; status: number; body?: unknown }> {
  const res = await fetch(`${DISCORD_API}/channels/${channelOrThreadId}/messages`, {
    method: 'POST',
    headers: authHeaders(env.botToken),
    body: JSON.stringify({
      content: content.slice(0, 1900),
      allowed_mentions: {
        parse: [],
        roles: mentionRoleIds,
      },
    }),
  })
  if (res.ok) return { ok: true, status: res.status }
  const body = await res.json().catch(() => null)
  return { ok: false, status: res.status, body }
}
