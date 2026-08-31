import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronLeft, ShoppingCart } from 'lucide-react'
import { Container } from '../components/Container'
import { getProductBySlug } from '../data/products'
import { useCart } from '../cart/CartContext'

export function ProductDetails() {
  const { slug } = useParams()
  const product = useMemo(() => (slug ? getProductBySlug(slug) : undefined), [slug])
  const cart = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  if (!product) {
    return (
      <div className="py-12">
        <Container>
          <div className="glass rounded-2xl p-6">
            <div className="text-lg font-black text-slate-800">Produto não encontrado</div>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              Esse produto não existe (ou mudou). Volte para a vitrine.
            </p>
            <Link
              to="/produtos"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pink-100 px-4 py-2 text-sm font-bold text-pink-700 hover:bg-pink-200/70"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Link>
          </div>
        </Container>
      </div>
    )
  }

  const handleAdd = () => {
    cart.add(product.id, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="py-10">
      <Container>
        <div className="mb-6">
          <Link
            to="/produtos"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--muted))] transition-colors duration-150 hover:text-pink-600"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para produtos
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="glass rounded-3xl p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-pink-200 bg-white/70 px-3 py-1 text-xs font-bold text-slate-700">
                {product.category}
              </span>
              {product.popular ? (
                <span className="rounded-full bg-pink-200/80 px-3 py-1 text-xs font-black text-pink-700">
                  Popular
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 text-3xl font-black text-slate-800">{product.name}</h1>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">{product.subtitle}</p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-pink-200 bg-white/70 p-5">
                <div className="text-sm font-semibold text-slate-800">Plataformas</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.platforms.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-pink-200 bg-white/80 px-3 py-1 text-xs text-slate-700"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-pink-200 bg-white/70 p-5">
                <div className="text-sm font-semibold text-slate-800">Entrega</div>
                <div className="mt-2 text-sm text-[rgb(var(--muted))]">{product.delivery}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-slate-800">O que você ganha</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.highlights.map((h) => (
                  <span key={h} className="rounded-full bg-pink-100 px-3 py-1 text-xs text-pink-700 ring-1 ring-pink-300/40">
                    {h}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-slate-800">Descrição</div>
                <p className="mt-2 text-sm text-[rgb(var(--muted))]">{product.description}</p>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Inclui</div>
                <ul className="mt-2 space-y-2 text-sm text-[rgb(var(--muted))]">
                  {product.includes.map((i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-pink-500" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <aside className="glass rounded-3xl p-6 md:p-7">
            <div className="text-sm font-semibold text-slate-800">Preço</div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-sm text-[rgb(var(--muted))]">A partir de</div>
              <div className="text-3xl font-black text-slate-800">R$ {product.priceBRL}</div>
            </div>

            <div className="mt-5 grid gap-3">
              <label className="text-xs font-bold text-[rgb(var(--muted))]">Quantidade</label>
              <div className="flex items-center justify-between rounded-2xl border border-pink-200 bg-white/70 px-3 py-2">
                <button
                  type="button"
                  className="rounded-xl bg-pink-100 px-3 py-2 text-sm font-black text-pink-700 transition-colors duration-150 hover:bg-pink-200/80"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  -
                </button>
                <div className="text-sm font-black text-slate-800">{qty}</div>
                <button
                  type="button"
                  className="rounded-xl bg-pink-100 px-3 py-2 text-sm font-black text-pink-700 transition-colors duration-150 hover:bg-pink-200/80"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                >
                  +
                </button>
              </div>

              <motion.button
                type="button"
                onClick={handleAdd}
                disabled={added}
                whileTap={{ scale: 0.95 }}
                className={`relative overflow-hidden w-full rounded-2xl px-5 py-3 text-sm font-black transition-all duration-200 ${
                  added
                    ? 'cursor-default bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                    : 'bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-[0_14px_36px_rgba(236,72,153,0.28)] hover:from-pink-600 hover:to-pink-500 hover:shadow-[0_18px_44px_rgba(236,72,153,0.40)]'
                }`}
              >
                <AnimatePresence mode="wait">
                  {added ? (
                    <motion.div
                      key="added"
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Adicionado!
                    </motion.div>
                  ) : (
                    <motion.div
                      key="add"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Adicionar ao carrinho
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <Link
                to="/carrinho"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-white/80 px-5 py-3 text-sm font-bold text-slate-800 transition-colors duration-200 hover:border-pink-300 hover:bg-pink-50"
              >
                Ver carrinho
              </Link>

              <div className="rounded-2xl border border-pink-200 bg-white/70 p-4 text-xs text-[rgb(var(--muted))]">
                Dica: no checkout você informa plataforma/dispositivo e seu contato para receber a
                entrega.
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  )
}
