// Helper compartilhado: dado um order ID já existente no banco,
// 1) Marca como paga (status='aprovado', payment_status='paid')
// 2) Atribui cargo de cliente no Discord
// 3) Cria thread privado no canal de tickets
// 4) Adiciona o cliente no thread
// 5) Posta mensagem inicial mencionando o suporte
//
// Usado por: stripe-webhook (quando payment_intent.succeeded)
//            create-payment-intent (quando cupom 100% off → pedido grátis)

import {
  assignRole,
  addUserToThread,
  createPrivateThread,
  postMessage,
  type DiscordEnv,
} from './discord.ts'

type SupabaseClient = ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2').createClient>

type OrderRow = {
  id: string
  order_id: string
  discord_user_id: string | null
  discord_thread_id: string | null
  discord_name: string | null
  total_brl: number
  coupon_code: string | null
  items: Array<{ name?: string; qty?: number; priceBRL?: number }>
}

export type FulfillOptions = {
  /** Se já está marcado como paid no banco, pula o UPDATE de status. */
  skipMarkPaid?: boolean
}

/**
 * Marca a order como paga (se ainda não estiver) e dispara a automação Discord.
 * Idempotente: se já foi feito antes, não faz nada destrutivo.
 */
export async function fulfillOrder(
  supabase: SupabaseClient,
  discordEnv: DiscordEnv | null,
  orderLookup: { paymentIntentId?: string; orderUuid?: string },
  opts: FulfillOptions = {},
): Promise<{ ok: boolean; reason?: string; threadId?: string }> {
  // 1. Carrega + marca como paga (se necessário)
  let order: OrderRow | null = null
  if (opts.skipMarkPaid) {
    const query = supabase
      .from('orders')
      .select('id, order_id, discord_user_id, discord_thread_id, discord_name, total_brl, coupon_code, items')
    const { data } = await (orderLookup.paymentIntentId
      ? query.eq('stripe_payment_intent_id', orderLookup.paymentIntentId).maybeSingle()
      : query.eq('id', orderLookup.orderUuid!).maybeSingle())
    order = (data as OrderRow | null) ?? null
  } else {
    const update = supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'aprovado',
        updated_at: new Date().toISOString(),
      })
    const { data, error } = await (orderLookup.paymentIntentId
      ? update.eq('stripe_payment_intent_id', orderLookup.paymentIntentId)
      : update.eq('id', orderLookup.orderUuid!))
      .select('id, order_id, discord_user_id, discord_thread_id, discord_name, total_brl, coupon_code, items')
      .maybeSingle()
    if (error) {
      console.error('Failed to mark order as paid', error)
      return { ok: false, reason: 'update_failed' }
    }
    order = (data as OrderRow | null) ?? null
  }

  if (!order) {
    console.warn('Order não encontrada', orderLookup)
    return { ok: false, reason: 'not_found' }
  }

  if (!discordEnv) {
    console.warn('Discord env ausente — pulando automação')
    return { ok: true, reason: 'no_discord_env' }
  }
  if (!order.discord_user_id) {
    console.warn(`Order ${order.order_id} sem discord_user_id`)
    return { ok: true, reason: 'no_discord_user' }
  }

  // 2. Atribui cargo de cliente. Idempotente.
  const roleRes = await assignRole(discordEnv, order.discord_user_id, discordEnv.customerRoleId)
  if (!roleRes.ok) {
    console.error(`Falha ao atribuir cargo cliente ${order.discord_user_id}`, roleRes)
  }

  // 3. Se já tem thread, não cria de novo (idempotência).
  if (order.discord_thread_id) {
    return { ok: true, threadId: order.discord_thread_id }
  }

  // 4. Cria thread privado.
  const threadName = `Pedido ${order.order_id} • ${order.discord_name ?? 'cliente'}`
  const threadRes = await createPrivateThread(discordEnv, threadName)
  if (!threadRes.ok || !threadRes.threadId) {
    console.error(`Falha criar thread ${order.order_id}`, threadRes)
    return { ok: false, reason: 'thread_create_failed' }
  }
  const threadId = threadRes.threadId

  await supabase.from('orders').update({ discord_thread_id: threadId }).eq('id', order.id)

  // 5. Adiciona o cliente no thread (private threads exigem add explícito).
  const addRes = await addUserToThread(discordEnv, threadId, order.discord_user_id)
  if (!addRes.ok) {
    console.error(`Falha add user ${order.discord_user_id} no thread ${threadId}`, addRes)
  }

  // 6. Mensagem inicial.
  const itemsLines = (order.items ?? [])
    .map((it) => `• ${it.name ?? '?'} (×${it.qty ?? 1}) — R$ ${(it.priceBRL ?? 0) * (it.qty ?? 1)}`)
    .join('\n')

  const couponLine = order.coupon_code
    ? `\n**Cupom:** \`${order.coupon_code}\``
    : ''

  const totalLine = order.total_brl === 0
    ? `**Total:** R$ 0 (pedido grátis 🎀)`
    : `**Total:** R$ ${order.total_brl}`

  const msg = [
    `🎀 **Pedido aprovado!** Bem-vindo(a), <@${order.discord_user_id}>.`,
    ``,
    `**Pedido:** \`${order.order_id}\``,
    totalLine + couponLine,
    itemsLines ? `**Itens:**\n${itemsLines}` : '',
    ``,
    `<@&${discordEnv.supportRoleId}> — atendimento solicitado, processem por favor.`,
    `Esse canal é privado: só você e a equipe de suporte conseguem ver.`,
  ].filter(Boolean).join('\n')

  const msgRes = await postMessage(discordEnv, threadId, msg, [discordEnv.supportRoleId])
  if (!msgRes.ok) {
    console.error(`Falha postar msg thread ${threadId}`, msgRes)
  }

  return { ok: true, threadId }
}
