import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Gauge, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Container } from '../components/Container'
import { products } from '../data/products'

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-pink-300/60 bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">
      {children}
    </span>
  )
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="glass shine rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-100 text-pink-600">
          {icon}
        </div>
        <div>
          <div className="font-semibold text-slate-800">{title}</div>
          <div className="mt-1 text-sm text-[rgb(var(--muted))]">{desc}</div>
        </div>
      </div>
    </div>
  )
}

export function Home() {
  const top = products.slice(0, 3)

  return (
    <div>
      <section className="relative overflow-hidden py-14 md:py-20">
        <Container>
          <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="max-w-xl"
            >
              <div className="flex flex-wrap gap-2">
                <Pill>Branco • Rosa • Fofo</Pill>
                <Pill>Entrega digital</Pill>
                <Pill>Suporte</Pill>
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-800 md:text-5xl">
                KittyFPS
                <span className="block bg-gradient-to-r from-pink-300 via-pink-500 to-rose-300 bg-clip-text text-transparent">
                  Otimização & Packs
                </span>
              </h1>
              <p className="mt-4 text-base text-[rgb(var(--muted))] md:text-lg">
                Serviços digitais para melhorar estabilidade, consistência e sensação de resposta.
                Do básico ao avançado (Android, iOS e PC).
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/produtos"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-pink-400 px-5 py-3 text-sm font-black text-white shadow-[0_16px_48px_rgba(236,72,153,0.30)] transition-all duration-200 hover:from-pink-600 hover:to-pink-500 hover:shadow-[0_20px_56px_rgba(236,72,153,0.42)]"
                >
                  Ver produtos
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/checkout"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-white/80 px-5 py-3 text-sm font-bold text-slate-800 transition-colors duration-200 hover:border-pink-300 hover:bg-pink-50"
                >
                  Finalizar pedido
                  <Sparkles className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6 text-xs text-[rgb(var(--muted))]">
                Preços em BRL (R$20–R$50). Pagamento seguro via Stripe — cartão (até 12x), Pix e Boleto.
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
              className="glass relative rounded-3xl p-6 md:w-[420px]"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-pink-300/25 to-transparent" />
              <div className="relative">
                <div className="text-sm font-semibold text-slate-800">Destaques rápidos</div>
                <div className="mt-4 grid gap-3">
                  <Feature
                    icon={<Gauge className="h-5 w-5" />}
                    title="FPS mais estável"
                    desc="Configurações direcionadas para reduzir travadas e quedas."
                  />
                  <Feature
                    icon={<Zap className="h-5 w-5" />}
                    title="Ajuste por plataforma"
                    desc="Android/iOS/PC com recomendações por dispositivo."
                  />
                  <Feature
                    icon={<ShieldCheck className="h-5 w-5" />}
                    title="Processo seguro"
                    desc="Ajustes guiados, reversíveis e com backup quando necessário."
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      <section className="py-10">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4 }}
            className="flex items-end justify-between gap-4"
          >
            <div>
              <div className="text-sm font-semibold text-pink-600">Vitrine</div>
              <h2 className="mt-1 text-2xl font-black text-slate-800">Produtos mais pedidos</h2>
              <p className="mt-2 text-sm text-[rgb(var(--muted))]">
                Escolha um pacote e finalize em poucos cliques.
              </p>
            </div>
            <Link
              to="/produtos"
              className="hidden items-center gap-2 rounded-xl border border-pink-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-pink-300 hover:bg-pink-50 sm:inline-flex"
            >
              Ver tudo <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {top.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  to={`/produtos/${p.slug}`}
                  className="glass shine block h-full rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_52px_rgba(244,114,182,0.22)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-[rgb(var(--muted))]">{p.category}</div>
                      <div className="mt-1 text-lg font-black text-slate-800">{p.name}</div>
                      <div className="mt-1 text-sm text-[rgb(var(--muted))]">{p.subtitle}</div>
                    </div>
                    {p.popular ? (
                      <span className="rounded-full bg-pink-200/80 px-3 py-1 text-xs font-black text-pink-700">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.highlights.slice(0, 3).map((h) => (
                      <span
                        key={h}
                        className="rounded-full border border-pink-200 bg-white/70 px-3 py-1 text-xs text-slate-700"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <div className="text-sm text-[rgb(var(--muted))]">A partir de</div>
                    <div className="text-xl font-black text-slate-800">R$ {p.priceBRL}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-10">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
            className="glass rounded-3xl p-6 md:p-10"
          >
            <div className="grid gap-6 md:grid-cols-2 md:items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Como funciona</h3>
                <ol className="mt-4 space-y-3 text-sm text-[rgb(var(--muted))]">
                  <li>
                    <span className="font-semibold text-slate-800">1)</span> Você escolhe o produto e
                    adiciona ao carrinho.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-800">2)</span> No checkout, informa
                    plataforma/dispositivo e contato.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-800">3)</span> Paga com cartão (em até 12x), Pix ou Boleto (via Stripe) e recebe o ID do pedido para resgate no Discord.
                  </li>
                </ol>
                <div className="mt-6 flex gap-3">
                  <Link
                    to="/produtos"
                    className="inline-flex items-center gap-2 rounded-2xl bg-pink-500 px-4 py-2 text-sm font-bold text-white transition-colors duration-200 hover:bg-pink-600"
                  >
                    Montar meu pedido <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/faq"
                    className="inline-flex items-center gap-2 rounded-2xl border border-pink-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-800 transition-colors duration-200 hover:border-pink-300 hover:bg-pink-50"
                  >
                    Ver dúvidas
                  </Link>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-pink-200 bg-white/70 p-5">
                  <div className="text-sm font-semibold text-slate-800">Transparência</div>
                  <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                    Sem promessa milagrosa. A ideia é ajustar o que dá resultado real no seu
                    dispositivo e te passar um processo simples de manutenção.
                  </p>
                </div>
                <div className="rounded-2xl border border-pink-200 bg-white/70 p-5">
                  <div className="text-sm font-semibold text-slate-800">Segurança</div>
                  <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                    Sempre que houver ajuste mais sensível (ex.: PC), fazemos backup e tudo é
                    reversível.
                  </p>
                </div>
                <div className="rounded-2xl border border-pink-200 bg-white/70 p-5">
                  <div className="text-sm font-semibold text-slate-800">Entrega</div>
                  <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                    Entrega digital (mensagem/arquivo/instruções). Prazo varia por fila e tipo de
                    pacote.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>
    </div>
  )
}
