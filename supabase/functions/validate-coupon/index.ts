// Preview do desconto: valida cupom + calcula novo total, sem incrementar
// uso e sem criar PaymentIntent. Usada pelo botão "Aplicar" no checkout.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateCoupon } from '../_shared/coupon.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Catálogo espelhado (igual create-payment-intent — server NUNCA confia
// no preço enviado pelo cliente).
const PRODUCTS: Record<string, { name: string; priceBRL: number }> = {
  'otm-basic':       { name: 'Otimização Simples',                priceBRL: 20 },
  'otm-advanced':    { name: 'Otimização Avançada',               priceBRL: 50 },
  'pack-sensi-pro':  { name: 'Pack OTM + Sensibilidade Pro',      priceBRL: 35 },
  'config-phone':    { name: 'Configs de Celular (Android/iOS)',  priceBRL: 25 },
  'regedit-pc':      { name: 'Regedit (Mouse/Teclado) — PC',      priceBRL: 30 },
}

function clampQty(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 1
  return Math.max(1, Math.min(99, Math.floor(v)))
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server misconfigured' }, 500)

  const supabase = createClient(supabaseUrl, serviceKey)

  const body = await req.json().catch(() => null) as { code?: string; items?: unknown[] } | null
  if (!body) return json({ error: 'Invalid body' }, 400)
  if (typeof body.code !== 'string' || body.code.trim().length === 0) {
    return json({ error: 'Cupom inválido' }, 400)
  }

  const items = Array.isArray(body.items) ? body.items : []
  if (items.length === 0) return json({ error: 'Carrinho vazio' }, 400)

  // Recalcula o subtotal SEMPRE no servidor.
  let subtotalBRL = 0
  for (const it of items) {
    const productId = typeof (it as { productId?: unknown })?.productId === 'string'
      ? (it as { productId: string }).productId : ''
    const p = PRODUCTS[productId]
    if (!p) return json({ error: `Produto inválido: ${productId}` }, 400)
    subtotalBRL += p.priceBRL * clampQty((it as { qty?: unknown }).qty)
  }

  const result = await validateCoupon(supabase, body.code, subtotalBRL)
  if (!result.valid) {
    const reasonMsg: Record<typeof result.reason, string> = {
      not_found: 'Cupom não existe.',
      inactive: 'Cupom desativado.',
      expired: 'Cupom expirado.',
      max_uses_reached: 'Cupom esgotado.',
    }
    return json({ valid: false, reason: result.reason, message: reasonMsg[result.reason] })
  }

  return json({
    valid: true,
    code: result.coupon.code,
    discountPercent: result.discountPercent,
    discountBRL: result.discountBRL,
    subtotalBRL,
    totalAfterDiscountBRL: result.totalAfterDiscountBRL,
  })
})
