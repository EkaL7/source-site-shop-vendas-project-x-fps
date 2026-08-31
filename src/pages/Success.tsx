import { Link, useLocation, useSearchParams, Navigate } from 'react-router-dom'
import { CheckCircle2, ChevronRight, MessageSquare, Copy, Check, Clock } from 'lucide-react'
import { Container } from '../components/Container'
import { useState } from 'react'

export function Success() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const state = location.state as { orderId?: string; free?: boolean } | null
  const [copied, setCopied] = useState(false)

  // Vem de redirect_status na URL (boleto/pix) OU do navigate state (cartão).
  const redirectStatus = searchParams.get('redirect_status')

  // orderId pode vir de:
  // 1. navigate state (fluxo cartão — não houve redirect)
  // 2. localStorage (fluxo boleto/pix — voltou de outro site, state foi perdido)
  let orderId = state?.orderId ?? null
  if (!orderId) {
    try {
      orderId = localStorage.getItem('kitty_last_order_id')
    } catch { /* ignora */ }
  }

  if (!orderId && !redirectStatus) {
    return <Navigate to="/" replace />
  }

  // 'processing' = boleto emitido aguardando pagamento (1-3 dias)
  // 'succeeded'  = cartão/pix aprovado na hora
  const isPending = redirectStatus === 'processing'
  const isFree = state?.free === true

  const handleCopy = () => {
    if (!orderId) return
    navigator.clipboard.writeText(orderId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          {isPending ? (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-amber-500/20 text-amber-600">
              <Clock className="h-12 w-12" />
            </div>
          ) : (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          )}

          <h1 className="mt-8 text-4xl font-black text-slate-800">
            {isPending
              ? 'Aguardando Pagamento'
              : isFree
                ? 'Pedido Confirmado! 🎀'
                : 'Pagamento Aprovado!'}
          </h1>
          <p className="mt-4 text-lg text-[rgb(var(--muted))]">
            {isPending
              ? 'Seu boleto foi gerado. Após o pagamento (1-3 dias úteis para compensar), liberamos o resgate no Discord.'
              : isFree
                ? 'Seu pedido foi liberado com cupom de cortesia. Já criamos um canal privado pra você no nosso Discord — confere lá.'
                : 'Seu pedido foi processado com sucesso. Para receber seu produto, você precisa resgatá-lo em nosso servidor do Discord.'}
          </p>

          <div className="mt-10 rounded-3xl border border-pink-200 bg-white/70 p-8 glass">
            <div className="text-sm font-bold text-[rgb(var(--muted))] uppercase tracking-wider">
              Número do Pedido
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="rounded-2xl border border-pink-300 bg-pink-100 px-6 py-4 text-3xl font-black tracking-widest text-pink-700 font-mono">
                {orderId ?? '—'}
              </div>
              <button
                onClick={handleCopy}
                className="group flex h-14 w-14 items-center justify-center rounded-2xl border border-pink-200 bg-white/80 text-slate-700 transition-colors duration-150 hover:border-pink-400 hover:bg-pink-50"
                title="Copiar número do pedido"
              >
                {copied ? <Check className="h-6 w-6 text-emerald-500" /> : <Copy className="h-6 w-6 text-[rgb(var(--muted))] group-hover:text-pink-600" />}
              </button>
            </div>
            <p className="mt-4 text-sm text-[rgb(var(--muted))]">
              Guarde este número. Você precisará enviá-lo para o nosso bot no Discord.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <a
              href="https://discord.gg/seu-link-aqui"
              target="_blank"
              rel="noreferrer"
              className="group relative flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#5865F2] px-6 py-4 text-base font-black text-white transition-colors duration-200 hover:bg-[#4752C4]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] skew-x-[-15deg] group-hover:animate-[shine_1.5s_ease-in-out]"></div>
              <MessageSquare className="h-5 w-5" />
              Resgatar no Discord
            </a>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-white/80 px-6 py-4 text-base font-bold text-slate-800 transition-colors duration-200 hover:border-pink-300 hover:bg-pink-50"
            >
              Voltar ao Início
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 rounded-2xl border border-pink-200/60 bg-white/50 p-6 text-sm text-[rgb(var(--muted))]">
            <h3 className="font-bold text-slate-800 mb-2">Como resgatar?</h3>
            <ol className="text-left space-y-2 list-decimal list-inside">
              <li>Clique no botão acima para entrar em nosso Discord.</li>
              <li>Vá até o canal <strong>#tickets</strong> ou <strong>#resgate</strong>.</li>
              <li>Abra um novo ticket e cole o número do seu pedido.</li>
              <li>Nossa equipe (ou nosso bot) validará sua compra e enviará as instruções/arquivos no mesmo ticket!</li>
            </ol>
          </div>
        </div>
      </Container>
    </div>
  )
}
