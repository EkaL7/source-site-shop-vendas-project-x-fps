import { Link } from 'react-router-dom'
import { Trash2, ArrowRight } from 'lucide-react'
import { Container } from '../components/Container'
import { useCart } from '../cart/CartContext'
import { getProductById } from '../data/products'

export function Cart() {
  const cart = useCart()
  const items = cart.items
    .map((i) => ({ item: i, product: getProductById(i.productId) }))
    .filter((x): x is { item: (typeof cart.items)[number]; product: NonNullable<ReturnType<typeof getProductById>> } =>
      Boolean(x.product),
    )

  return (
    <div className="py-10">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-pink-600">Carrinho</div>
            <h1 className="mt-1 text-3xl font-black text-slate-800">Seu pedido</h1>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              Confira os itens e finalize pelo checkout.
            </p>
          </div>
          {cart.count > 0 ? (
            <button
              type="button"
              onClick={cart.clear}
              className="rounded-xl border border-pink-200 bg-white/80 px-3 py-2 text-sm font-bold text-slate-700 transition-colors duration-200 hover:border-pink-300 hover:bg-pink-50"
            >
              Limpar
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="glass mt-8 rounded-3xl p-8 text-center">
            <div className="text-lg font-black text-slate-800">Carrinho vazio</div>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              Escolha um pacote e volte aqui para finalizar.
            </p>
            <Link
              to="/produtos"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-pink-400 px-5 py-3 text-sm font-black text-white shadow-[0_16px_40px_rgba(236,72,153,0.28)] transition-all duration-200 hover:from-pink-600 hover:to-pink-500 hover:shadow-[0_20px_48px_rgba(236,72,153,0.40)]"
            >
              Ver produtos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="glass rounded-3xl p-6">
              <div className="space-y-4">
                {items.map(({ item, product }) => (
                  <div
                    key={product.id}
                    className="flex flex-col gap-3 rounded-2xl border border-pink-200 bg-white/70 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-xs text-[rgb(var(--muted))]">{product.category}</div>
                      <div className="mt-1 text-base font-black text-slate-800">{product.name}</div>
                      <div className="mt-1 text-sm text-[rgb(var(--muted))]">R$ {product.priceBRL} cada</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center overflow-hidden rounded-2xl border border-pink-200 bg-white">
                        <button
                          type="button"
                          className="px-3 py-2 text-sm font-black text-pink-600 transition-colors duration-150 hover:bg-pink-50"
                          onClick={() => cart.setQty(product.id, item.qty - 1)}
                        >
                          -
                        </button>
                        <div className="w-12 bg-transparent px-2 py-2 text-center text-sm font-black text-slate-800">
                          {item.qty}
                        </div>
                        <button
                          type="button"
                          className="px-3 py-2 text-sm font-black text-pink-600 transition-colors duration-150 hover:bg-pink-50"
                          onClick={() => cart.setQty(product.id, item.qty + 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="w-20 text-right text-base font-black text-slate-800">
                        R$ {product.priceBRL * item.qty}
                      </div>

                      <button
                        type="button"
                        onClick={() => cart.remove(product.id)}
                        className="rounded-xl border border-pink-200 bg-white/80 p-2 text-pink-600 transition-colors duration-150 hover:border-pink-300 hover:bg-pink-50"
                        aria-label="Remover item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="glass rounded-3xl p-6">
              <div className="text-sm font-semibold text-slate-800">Resumo</div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-[rgb(var(--muted))]">
                  <span>Itens</span>
                  <span className="font-bold text-slate-800">{cart.count}</span>
                </div>
                <div className="flex items-center justify-between text-[rgb(var(--muted))]">
                  <span>Subtotal</span>
                  <span className="font-black text-slate-800">R$ {cart.subtotalBRL}</span>
                </div>
              </div>

              <Link
                to="/checkout"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-pink-400 px-5 py-3 text-sm font-black text-white shadow-[0_16px_40px_rgba(236,72,153,0.28)] transition-all duration-200 hover:from-pink-600 hover:to-pink-500 hover:shadow-[0_20px_48px_rgba(236,72,153,0.40)]"
              >
                Ir para checkout <ArrowRight className="h-4 w-4" />
              </Link>

              <div className="mt-4 rounded-2xl border border-pink-200 bg-white/70 p-4 text-xs text-[rgb(var(--muted))]">
                Pagamento seguro via Stripe: cartão (crédito/débito, até 12x), Pix ou Boleto. Liberação automática após aprovação.
              </div>
            </aside>
          </div>
        )}
      </Container>
    </div>
  )
}
