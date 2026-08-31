// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@17?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { bumpCouponUsage, validateCoupon } from '../_shared/coupon.ts'
import { fulfillOrder } from '../_shared/fulfill-order.ts'
import { getDiscordEnv } from '../_shared/discord.ts'

// Catálogo espelhado de src/data/products.ts (o servidor NUNCA confia no preço enviado pelo cliente).
const PRODUCTS: Record<string, { name: string; priceBRL: number }> = {
  'otm-basic':       { name: 'Otimização Simples',                priceBRL: 20 },
  'otm-advanced':    { name: 'Otimização Avançada',               priceBRL: 50 },
  'pack-sensi-pro':  { name: 'Pack OTM + Sensibilidade Pro',      priceBRL: 35 },
  'config-phone':    { name: 'Configs de Celular (Android/iOS)',  priceBRL: 25 },
  'regedit-pc':      { name: 'Regedit (Mouse/Teclado) — PC',      priceBRL: 30 },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function clampQty(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 1
  return Math.max(1, Math.min(99, Math.floor(v)))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!stripeKey || !supabaseUrl || !serviceKey) {
      return json({ error: 'Server misconfigured' }, 500)
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' })
    const supabase = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return json({ error: 'Invalid body' }, 400)

    const items = Array.isArray((body as any).items) ? (body as any).items : []
    const userId = typeof (body as any).userId === 'string' ? (body as any).userId : null
    const customer = (body as any).customer || {}
    const couponCodeRaw = typeof (body as any).couponCode === 'string'
      ? ((body as any).couponCode as string).trim()
      : ''

    if (items.length === 0) return json({ error: 'Carrinho vazio' }, 400)
    if (typeof customer.nick !== 'string' || customer.nick.trim().length < 2) return json({ error: 'Nick inválido' }, 400)
    if (!['Android', 'iOS', 'PC'].includes(customer.plataforma)) return json({ error: 'Plataforma inválida' }, 400)
    if (typeof customer.dispositivo !== 'string' || customer.dispositivo.trim().length < 2) return json({ error: 'Dispositivo inválido' }, 400)
    if (typeof customer.whatsapp !== 'string' || customer.whatsapp.replace(/\D/g, '').length < 10) return json({ error: 'WhatsApp inválido' }, 400)

    // 1. Calcula subtotal a partir do catálogo no servidor.
    let subtotalBRL = 0
    const lineItems: Array<{ productId: string; name: string; qty: number; priceBRL: number }> = []
    for (const it of items) {
      const productId = typeof it?.productId === 'string' ? it.productId : ''
      const p = PRODUCTS[productId]
      if (!p) return json({ error: `Produto inválido: ${productId}` }, 400)
      const qty = clampQty(it?.qty)
      subtotalBRL += p.priceBRL * qty
      lineItems.push({ productId, name: p.name, qty, priceBRL: p.priceBRL })
    }
    if (subtotalBRL <= 0) return json({ error: 'Total inválido' }, 400)

    // 2. Aplica cupom (se enviado). Re-valida tudo no servidor — não confia no preview.
    let totalBRL = subtotalBRL
    let appliedCoupon: { code: string; discountPercent: number; discountBRL: number } | null = null
    if (couponCodeRaw) {
      const result = await validateCoupon(supabase, couponCodeRaw, subtotalBRL)
      if (!result.valid) {
        return json({ error: 'Cupom inválido ou expirado.', couponReason: result.reason }, 400)
      }
      totalBRL = result.totalAfterDiscountBRL
      appliedCoupon = {
        code: result.coupon.code,
        discountPercent: result.discountPercent,
        discountBRL: result.discountBRL,
      }
    }

    // 3. Resolve discord_user_id pra salvar na order.
    let discordUserId: string | null = null
    if (userId) {
      const { data: userResp } = await supabase.auth.admin.getUserById(userId)
      const meta = (userResp?.user?.user_metadata ?? {}) as Record<string, unknown>
      discordUserId =
        (meta.provider_id as string | undefined) ||
        (meta.sub as string | undefined) ||
        ((meta.custom_claims as { provider_id?: string } | undefined)?.provider_id) ||
        null
    }

    const orderId = `#KT-${Math.floor(10000 + Math.random() * 90000)}`

    // 4. CAMINHO A — pedido grátis (cupom 100%): pula Stripe, finaliza direto.
    if (totalBRL === 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from('orders')
        .insert({
          order_id: orderId,
          user_id: userId,
          discord_name: String(customer.nick).slice(0, 80),
          plataforma: String(customer.plataforma),
          dispositivo: String(customer.dispositivo).slice(0, 120),
          whatsapp: String(customer.whatsapp).slice(0, 30),
          obs: typeof customer.obs === 'string' ? String(customer.obs).slice(0, 1000) : null,
          total_brl: 0,
          items: lineItems,
          payment_status: 'paid',
          status: 'aprovado',
          discord_user_id: discordUserId,
          coupon_code: appliedCoupon?.code ?? null,
          coupon_discount_brl: appliedCoupon?.discountBRL ?? null,
        })
        .select('id')
        .single()

      if (insertErr || !inserted) {
        console.error('Free order insert failed', insertErr)
        return json({ error: 'Falha ao criar pedido grátis' }, 500)
      }

      // Incrementa o contador do cupom (idempotência: se quebrar, não trava o pedido).
      if (appliedCoupon) {
        try { await bumpCouponUsage(supabase, appliedCoupon.code) } catch (e) { console.warn(e) }
      }

      // Dispara automação Discord (cargo + thread + msg). Não trava se falhar.
      try {
        const discordEnv = getDiscordEnv()
        await fulfillOrder(
          supabase,
          discordEnv,
          { orderUuid: inserted.id as string },
          { skipMarkPaid: true },
        )
      } catch (e) {
        console.warn('fulfillOrder (free) falhou', e)
      }

      return json({
        freeOrder: true,
        orderId,
        totalBRL: 0,
        subtotalBRL,
        coupon: appliedCoupon,
      })
    }

    // 5. CAMINHO B — fluxo Stripe normal.
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(totalBRL * 100),
      currency: 'brl',
      automatic_payment_methods: { enabled: true },
      payment_method_options: {
        card: { installments: { enabled: true } },
      },
      description: `KittyFPS ${orderId}`,
      metadata: {
        order_id: orderId,
        user_id: userId ?? '',
        nick: String(customer.nick).slice(0, 80),
        plataforma: String(customer.plataforma),
        dispositivo: String(customer.dispositivo).slice(0, 120),
        whatsapp: String(customer.whatsapp).slice(0, 30),
        coupon_code: appliedCoupon?.code ?? '',
      },
    })

    const { error: insertErr } = await supabase.from('orders').insert({
      order_id: orderId,
      user_id: userId,
      discord_name: String(customer.nick).slice(0, 80),
      plataforma: String(customer.plataforma),
      dispositivo: String(customer.dispositivo).slice(0, 120),
      whatsapp: String(customer.whatsapp).slice(0, 30),
      obs: typeof customer.obs === 'string' ? String(customer.obs).slice(0, 1000) : null,
      total_brl: totalBRL,
      items: lineItems,
      stripe_payment_intent_id: pi.id,
      payment_status: 'pending',
      status: 'pendente',
      discord_user_id: discordUserId,
      coupon_code: appliedCoupon?.code ?? null,
      coupon_discount_brl: appliedCoupon?.discountBRL ?? null,
    })

    if (insertErr) {
      console.error('Failed to insert order', insertErr)
    }

    // Incrementa cupom (mesmo se a tx falhar depois — fica como uso "tentado",
    // simples o suficiente. Se virar problema, refatorar pra incrementar no webhook).
    if (appliedCoupon) {
      try { await bumpCouponUsage(supabase, appliedCoupon.code) } catch (e) { console.warn(e) }
    }

    return json({
      clientSecret: pi.client_secret,
      orderId,
      totalBRL,
      subtotalBRL,
      coupon: appliedCoupon,
    })
  } catch (err) {
    console.error('create-payment-intent error', err)
    return json({ error: (err as Error).message || 'Erro interno' }, 500)
  }
})
