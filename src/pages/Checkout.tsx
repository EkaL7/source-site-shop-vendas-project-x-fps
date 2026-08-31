import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, MessageCircleWarning, Loader2, MessageSquare, Lock, Tag, X, Sparkles } from 'lucide-react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import type { Appearance } from '@stripe/stripe-js'
import { Container } from '../components/Container'
import { useCart } from '../cart/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { getProductById } from '../data/products'
import { getStripe } from '../lib/stripe'

type FormState = {
  nick: string
  plataforma: 'Android' | 'iOS' | 'PC' | ''
  dispositivo: string
  whatsapp: string
  obs: string
}

const initial: FormState = {
  nick: '',
  plataforma: '',
  dispositivo: '',
  whatsapp: '',
  obs: '',
}

function formatPhoneBR(v: string) {
  let digits = v.replace(/\D/g, '')
  if (digits.length > 11) digits = digits.slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function cleanPhone(v: string) {
  return v.replace(/[^\d+]/g, '')
}

// Discord OAuth via Supabase salva o nome em vários campos dependendo da conta.
// Tenta na ordem: global_name (Discord novo) → full_name → name → user_name → email.
function pickDiscordNick(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return ''
  const m = (user.user_metadata ?? {}) as Record<string, unknown>
  const candidates = [
    m.global_name,
    m.full_name,
    m.name,
    m.preferred_username,
    m.user_name,
    m.nickname,
    (m.custom_claims as { global_name?: string } | undefined)?.global_name,
    user.email?.split('@')[0],
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim()
  }
  return ''
}

const stripeAppearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#ec4899',
    colorBackground: '#ffffff',
    colorText: '#1e293b',
    colorDanger: '#ef4444',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      border: '1px solid #fbcfe8',
      boxShadow: 'none',
    },
    '.Input:focus': {
      border: '1px solid #ec4899',
      boxShadow: '0 0 0 2px rgba(236, 72, 153, 0.15)',
    },
    '.Tab': {
      border: '1px solid #fbcfe8',
    },
    '.Tab--selected': {
      borderColor: '#ec4899',
      backgroundColor: '#fdf2f8',
    },
  },
}

function PaymentForm({
  totalBRL,
  orderId,
  onSuccess,
  onError,
}: {
  totalBRL: number
  orderId: string
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsProcessing(true)
    onError('')

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/sucesso`,
      },
      redirect: 'if_required',
    })

    if (error) {
      onError(error.message || 'Falha ao processar pagamento.')
      setIsProcessing(false)
      return
    }

    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      onSuccess()
      return
    }

    setIsProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-pink-200 bg-white/90 p-5">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-pink-400 px-5 py-4 text-sm font-black text-white shadow-[0_16px_48px_rgba(236,72,153,0.30)] transition-all duration-200 hover:from-pink-600 hover:to-pink-500 hover:shadow-[0_20px_56px_rgba(236,72,153,0.42)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Processando...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" /> Pagar R$ {totalBRL} ({orderId})
          </>
        )}
      </button>

      <div className="text-center text-xs text-[rgb(var(--muted))]">
        Pagamento seguro via Stripe. Não armazenamos dados de cartão.
      </div>
    </form>
  )
}

export function Checkout() {
  const cart = useCart()
  const nav = useNavigate()
  const { user, signInWithDiscord } = useAuth()

  const [form, setForm] = useState<FormState>({ ...initial })
  const [nickEditedManually, setNickEditedManually] = useState(false)
  const [step, setStep] = useState<'form' | 'payment'>('form')

  // Sincroniza o nick com o user assim que ele carrega.
  // Se o usuário já editou manualmente, respeita a escolha dele.
  useEffect(() => {
    if (nickEditedManually) return
    const auto = pickDiscordNick(user)
    if (auto) {
      setForm((s) => (s.nick === auto ? s : { ...s, nick: auto }))
    }
  }, [user, nickEditedManually])
  const [creating, setCreating] = useState(false)
  const [paymentError, setPaymentError] = useState<string>('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [confirmedTotalBRL, setConfirmedTotalBRL] = useState<number>(0)

  // === Cupom ===
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string>('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discountPercent: number
    discountBRL: number
    totalAfterDiscountBRL: number
  } | null>(null)

  // Total exibido no resumo (já considera o cupom).
  const displayTotalBRL = appliedCoupon?.totalAfterDiscountBRL ?? cart.subtotalBRL
  const isFreeOrder = displayTotalBRL === 0

  const handleApplyCoupon = async () => {
    const code = couponInput.trim()
    if (!code) return
    setCouponError('')
    setCouponLoading(true)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      const res = await fetch(`${supabaseUrl}/functions/v1/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify({ code, items: cart.items }),
      })
      const data = await res.json()
      if (!res.ok || data.valid === false) {
        setCouponError(data.message || data.error || 'Cupom inválido.')
        setAppliedCoupon(null)
        return
      }
      setAppliedCoupon({
        code: data.code,
        discountPercent: data.discountPercent,
        discountBRL: data.discountBRL,
        totalAfterDiscountBRL: data.totalAfterDiscountBRL,
      })
      setCouponInput('')
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Erro ao validar cupom.')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponError('')
  }

  const stripePromise = useMemo(() => getStripe(), [])

  const lines = useMemo(() => {
    return cart.items
      .map((i) => ({ i, p: getProductById(i.productId) }))
      .filter((x) => x.p)
      .map(({ i, p }) => `- ${p!.name} (x${i.qty}) — R$${p!.priceBRL * i.qty}`)
  }, [cart.items])

  const canProceed =
    cart.items.length > 0 &&
    form.nick.trim().length >= 2 &&
    Boolean(form.plataforma) &&
    form.dispositivo.trim().length >= 2 &&
    cleanPhone(form.whatsapp).length >= 10

  const handleProceedToPayment = async () => {
    if (!user || !canProceed) return
    setCreating(true)
    setPaymentError('')

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase não configurado. Verifique seu .env.')
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          items: cart.items,
          userId: user.id,
          couponCode: appliedCoupon?.code ?? '',
          customer: {
            nick: form.nick,
            plataforma: form.plataforma,
            dispositivo: form.dispositivo,
            whatsapp: form.whatsapp,
            obs: form.obs,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao iniciar pagamento.')

      // Persiste pra recuperar na /sucesso após redirect do boleto/pix
      try {
        localStorage.setItem('kitty_last_order_id', data.orderId)
      } catch { /* localStorage indisponível, segue */ }

      // CAMINHO A: pedido grátis (cupom 100%) — pula a etapa Stripe.
      if (data.freeOrder) {
        cart.clear()
        nav('/sucesso', { state: { orderId: data.orderId, free: true } })
        return
      }

      // CAMINHO B: fluxo Stripe normal.
      setClientSecret(data.clientSecret)
      setOrderId(data.orderId)
      setConfirmedTotalBRL(data.totalBRL)
      setStep('payment')
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setCreating(false)
    }
  }

  const handlePaymentSuccess = () => {
    cart.clear()
    nav('/sucesso', { state: { orderId } })
  }

  return (
    <div className="py-10">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-pink-600">Checkout</div>
            <h1 className="mt-1 text-3xl font-black text-slate-800">Finalizar pedido</h1>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              {step === 'form'
                ? 'Preencha os dados e siga para o pagamento.'
                : 'Conclua seu pagamento com segurança via Stripe.'}
            </p>
          </div>
          {step === 'form' ? (
            <Link
              to="/carrinho"
              className="rounded-xl border border-pink-200 bg-white/70 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-pink-50"
            >
              Voltar ao carrinho
            </Link>
          ) : (
            <button
              onClick={() => {
                setStep('form')
                setClientSecret(null)
                setOrderId(null)
              }}
              className="rounded-xl border border-pink-200 bg-white/70 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-pink-50"
            >
              Voltar aos dados
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="glass rounded-3xl p-6 md:p-8">
            <div className="text-sm font-semibold text-slate-800">
              {step === 'form' ? '1. Seus dados' : '2. Pagamento'}
            </div>

            {!user ? (
              <div className="mt-8 flex flex-col items-center justify-center text-center py-10">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#5865F2]/10 text-[#5865F2]">
                  <MessageSquare className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Identifique-se para continuar</h3>
                <p className="mt-2 text-sm text-[rgb(var(--muted))] max-w-sm">
                  Para entregarmos seu produto no Discord, faça login antes de finalizar a compra.
                </p>
                <button
                  onClick={signInWithDiscord}
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#5865F2] px-6 py-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#4752C4]"
                >
                  Entrar com Discord agora
                </button>
              </div>
            ) : step === 'form' ? (
              <>
                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold text-[rgb(var(--muted))]">Nick/Nome do Discord</span>
                    <input
                      value={form.nick}
                      onChange={(e) => {
                        setNickEditedManually(true)
                        setForm((s) => ({ ...s, nick: e.target.value }))
                      }}
                      placeholder="Seu @ do Discord"
                      className="rounded-2xl border border-pink-200 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-pink-400"
                    />
                    <span className="text-[10px] text-pink-600">
                      {form.nick ? 'Pré-preenchido pelo seu Discord — você pode editar.' : 'Digite o nome de usuário com que você está no nosso Discord.'}
                    </span>
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-[rgb(var(--muted))]">Plataforma</span>
                      <select
                        value={form.plataforma}
                        onChange={(e) => setForm((s) => ({ ...s, plataforma: e.target.value as FormState['plataforma'] }))}
                        className="rounded-2xl border border-pink-200 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none focus:border-pink-400"
                      >
                        <option value="">Selecionar</option>
                        <option value="Android">Android</option>
                        <option value="iOS">iOS</option>
                        <option value="PC">PC</option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-[rgb(var(--muted))]">Dispositivo</span>
                      <input
                        value={form.dispositivo}
                        onChange={(e) => setForm((s) => ({ ...s, dispositivo: e.target.value }))}
                        className="rounded-2xl border border-pink-200 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-pink-400"
                        placeholder="Ex.: iPhone 11 / Redmi Note 12 / PC i5..."
                      />
                    </label>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-xs font-bold text-[rgb(var(--muted))]">Seu WhatsApp</span>
                    <input
                      value={form.whatsapp}
                      onChange={(e) => setForm((s) => ({ ...s, whatsapp: formatPhoneBR(e.target.value) }))}
                      maxLength={15}
                      className="rounded-2xl border border-pink-200 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-pink-400"
                      placeholder="(11) 99999-9999"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-bold text-[rgb(var(--muted))]">Observações (opcional)</span>
                    <textarea
                      value={form.obs}
                      onChange={(e) => setForm((s) => ({ ...s, obs: e.target.value }))}
                      className="min-h-28 rounded-2xl border border-pink-200 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-pink-400"
                      placeholder="Ex.: jogo travando após atualização, preferência de sensi, etc."
                    />
                  </label>

                  {/* === Cupom === */}
                  <div className="grid gap-2">
                    <span className="text-xs font-bold text-[rgb(var(--muted))]">
                      Cupom de desconto (opcional)
                    </span>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Tag className="h-4 w-4 text-emerald-600" />
                          <span className="font-black text-emerald-700">{appliedCoupon.code}</span>
                          <span className="text-emerald-700">
                            • -{appliedCoupon.discountPercent}% (R$ {appliedCoupon.discountBRL})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="rounded-lg p-1.5 text-emerald-700 transition-colors duration-150 hover:bg-emerald-100"
                          title="Remover cupom"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-pink-200 bg-white/80 px-4 py-3 focus-within:border-pink-400">
                          <Tag className="h-4 w-4 text-[rgb(var(--muted))]" />
                          <input
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleApplyCoupon()
                              }
                            }}
                            placeholder="Digite o código"
                            className="w-full bg-transparent text-sm tracking-wider text-slate-800 outline-none placeholder:text-slate-400"
                            maxLength={32}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={!couponInput.trim() || couponLoading}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-pink-100 px-5 text-sm font-black text-pink-700 transition-colors duration-150 hover:bg-pink-200/80 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                        </button>
                      </div>
                    )}
                    {couponError ? (
                      <span className="text-xs text-rose-600">{couponError}</span>
                    ) : null}
                  </div>
                </div>

                {paymentError ? (
                  <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-700">
                    {paymentError}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleProceedToPayment}
                    disabled={!canProceed || creating}
                    className={[
                      'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition-all duration-200',
                      canProceed && !creating
                        ? 'bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-[0_16px_48px_rgba(236,72,153,0.28)] hover:from-pink-600 hover:to-pink-500 hover:shadow-[0_20px_56px_rgba(236,72,153,0.40)]'
                        : 'cursor-not-allowed bg-pink-100 text-pink-300',
                    ].join(' ')}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Iniciando...
                      </>
                    ) : isFreeOrder ? (
                      <>
                        <Sparkles className="h-4 w-4" /> Finalizar pedido grátis
                      </>
                    ) : (
                      <>
                        Ir para Pagamento <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

                {!canProceed ? (
                  <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
                    <MessageCircleWarning className="mt-0.5 min-w-[16px] h-4 w-4" />
                    <div>
                      Para liberar o pagamento, preencha os campos obrigatórios
                      (nick, plataforma, dispositivo e WhatsApp).
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              // PAYMENT STEP
              <div className="mt-5">
                {clientSecret && stripePromise ? (
                  <Elements
                    stripe={stripePromise}
                    options={{ clientSecret, appearance: stripeAppearance, locale: 'pt-BR' }}
                  >
                    <PaymentForm
                      totalBRL={confirmedTotalBRL}
                      orderId={orderId ?? ''}
                      onSuccess={handlePaymentSuccess}
                      onError={setPaymentError}
                    />
                  </Elements>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-[rgb(var(--muted))]">
                    <Loader2 className="h-5 w-5 animate-spin" /> Carregando pagamento...
                  </div>
                )}

                {paymentError ? (
                  <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-700">
                    {paymentError}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="glass rounded-3xl p-6 md:p-8">
            <div className="text-sm font-semibold text-slate-800">Resumo</div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-pink-200 bg-white/70 p-5">
                {appliedCoupon ? (
                  <>
                    <div className="flex items-center justify-between text-sm text-[rgb(var(--muted))]">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-700">R$ {cart.subtotalBRL}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-emerald-700">
                      <span>Desconto ({appliedCoupon.code})</span>
                      <span className="font-bold">- R$ {appliedCoupon.discountBRL}</span>
                    </div>
                    <div className="my-3 h-px bg-pink-200/60" />
                  </>
                ) : null}
                <div className="text-xs text-[rgb(var(--muted))]">Total a pagar</div>
                <div className="mt-1 text-2xl font-black text-slate-800">
                  {isFreeOrder ? 'Grátis 🎀' : `R$ ${displayTotalBRL}`}
                </div>
                <div className="mt-2 text-xs text-[rgb(var(--muted))]">
                  {isFreeOrder
                    ? 'Pedido cortesia — finalização imediata.'
                    : 'Pagamento 100% seguro. Liberação automática após aprovação.'}
                </div>
              </div>

              <div className="rounded-2xl border border-pink-200 bg-white/70 p-5">
                <div className="text-xs font-bold text-[rgb(var(--muted))]">Itens no carrinho</div>
                <div className="mt-2 space-y-2 text-sm">
                  {lines.length ? (
                    lines.map((l) => (
                      <div key={l} className="text-slate-700">
                        {l}
                      </div>
                    ))
                  ) : (
                    <div className="text-[rgb(var(--muted))]">Carrinho vazio.</div>
                  )}
                </div>
                {step === 'form' && (
                  <Link
                    to="/carrinho"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pink-100 px-3 py-2 text-sm font-bold text-pink-700 hover:bg-pink-200/70"
                  >
                    Ajustar carrinho <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-xs text-emerald-700">
                Após o pagamento aprovado, você receberá o ID do Pedido para resgatar os itens no
                nosso Discord. O status fica disponível em <Link to="/pedidos" className="font-bold underline">Meus Pedidos</Link>.
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
