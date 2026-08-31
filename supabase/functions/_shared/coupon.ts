// Helper compartilhado: validação e aplicação de cupons.
// Usado por validate-coupon (preview) e create-payment-intent (aplicação real).

type SupabaseClient = ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2').createClient>

export type CouponRow = {
  code: string
  discount_percent: number
  max_uses: number | null
  current_uses: number
  active: boolean
  expires_at: string | null
}

export type CouponValidationResult =
  | {
      valid: true
      coupon: CouponRow
      discountPercent: number
      discountBRL: number
      totalAfterDiscountBRL: number
    }
  | {
      valid: false
      reason:
        | 'not_found'
        | 'inactive'
        | 'expired'
        | 'max_uses_reached'
    }

/**
 * Valida um cupom e calcula o desconto aplicado ao subtotal.
 * NÃO incrementa o contador de uso — isso só acontece quando a order é
 * efetivamente criada (em create-payment-intent).
 */
export async function validateCoupon(
  supabase: SupabaseClient,
  rawCode: string,
  subtotalBRL: number,
): Promise<CouponValidationResult> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { valid: false, reason: 'not_found' }

  const { data } = await supabase
    .from('coupons')
    .select('code, discount_percent, max_uses, current_uses, active, expires_at')
    .ilike('code', code)
    .maybeSingle()

  const coupon = data as CouponRow | null
  if (!coupon) return { valid: false, reason: 'not_found' }
  if (!coupon.active) return { valid: false, reason: 'inactive' }

  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: 'expired' }
  }

  if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
    return { valid: false, reason: 'max_uses_reached' }
  }

  const discountBRL = round2(subtotalBRL * (coupon.discount_percent / 100))
  const totalAfterDiscountBRL = round2(Math.max(0, subtotalBRL - discountBRL))

  return {
    valid: true,
    coupon,
    discountPercent: coupon.discount_percent,
    discountBRL,
    totalAfterDiscountBRL,
  }
}

/** Incrementa atomicamente o contador de uso. Chamar APÓS validar. */
export async function bumpCouponUsage(
  supabase: SupabaseClient,
  code: string,
): Promise<void> {
  // Usa SQL direto pra ser atômico (current_uses + 1).
  // Supabase JS não tem rpc inline simples — usamos update com filter.
  const { data: existing } = await supabase
    .from('coupons')
    .select('current_uses')
    .ilike('code', code)
    .maybeSingle()
  const next = (existing?.current_uses ?? 0) + 1
  await supabase.from('coupons').update({ current_uses: next }).ilike('code', code)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
