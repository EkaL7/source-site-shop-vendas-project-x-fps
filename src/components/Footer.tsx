import { Link } from 'react-router-dom'
import { Container } from './Container'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-pink-200/60">
      <Container className="py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-sm font-extrabold tracking-[0.2em] text-slate-800">KITTYFPS</div>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              Loja de otimização e packs de configuração. Entrega digital, suporte e foco em
              estabilidade.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <div className="font-semibold text-slate-800">Site</div>
              <div>
                <Link className="text-[rgb(var(--muted))] hover:text-pink-600" to="/produtos">
                  Produtos
                </Link>
              </div>
              <div>
                <Link className="text-[rgb(var(--muted))] hover:text-pink-600" to="/carrinho">
                  Carrinho
                </Link>
              </div>
              <div>
                <Link className="text-[rgb(var(--muted))] hover:text-pink-600" to="/checkout">
                  Checkout
                </Link>
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-slate-800">Suporte</div>
              <div>
                <Link className="text-[rgb(var(--muted))] hover:text-pink-600" to="/faq">
                  FAQ
                </Link>
              </div>
              <div>
                <Link className="text-[rgb(var(--muted))] hover:text-pink-600" to="/politicas">
                  Políticas
                </Link>
              </div>
            </div>
          </div>
          <div className="text-sm text-[rgb(var(--muted))]">
            <div className="font-semibold text-slate-800">Atendimento</div>
            <p className="mt-2">
              Pagamento seguro via Stripe (cartão / Pix). Após aprovação você recebe o ID do pedido
              para resgate no Discord.
            </p>
            <p className="mt-2 text-xs">
              Observação: os serviços são focados em configurações e otimização geral, sem promessas
              irreais. Resultados variam conforme o dispositivo.
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-pink-200/60 pt-6 text-xs text-[rgb(var(--muted))] md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} KittyFPS. Todos os direitos reservados.</div>
          <div>kittyfps.com</div>
        </div>
      </Container>
    </footer>
  )
}
