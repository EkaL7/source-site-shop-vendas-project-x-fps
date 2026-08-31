import { NavLink, Link } from 'react-router-dom'
import { ShoppingCart, Sparkles, LogOut } from 'lucide-react'
import { Container } from './Container'
import { LogoMark } from './LogoMark'
import { cn } from '../lib/cn'
import { useCart } from '../cart/CartContext'
import { useAuth } from '../contexts/AuthContext'

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'rounded-lg px-3 py-2 text-sm font-medium tracking-wide transition-colors duration-150',
          isActive
            ? 'bg-pink-100 text-pink-700'
            : 'text-[rgb(var(--muted))] hover:bg-pink-50/80 hover:text-pink-600',
        )
      }
    >
      {children}
    </NavLink>
  )
}

export function TopNav() {
  const cart = useCart()
  const { user, signInWithDiscord, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-pink-200/60 bg-white/70 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between">
        <Link to="/" className="group flex items-center gap-3">
          <LogoMark className="h-9 w-9 drop-shadow-[0_0_18px_rgba(244,114,182,0.45)] transition group-hover:drop-shadow-[0_0_22px_rgba(236,72,153,0.55)]" />
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-[0.18em] text-slate-800">KITTYFPS</div>
            <div className="text-[11px] text-[rgb(var(--muted))]">FPS • Otimização</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavItem to="/produtos">Produtos</NavItem>
          <NavItem to="/faq">FAQ</NavItem>
          <NavItem to="/politicas">Políticas</NavItem>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/produtos"
            className="hidden items-center gap-2 rounded-xl border border-pink-300/60 bg-pink-100 px-3 py-2 text-sm font-semibold text-pink-700 shadow-[0_0_0_1px_rgba(236,72,153,0.10)_inset] transition-colors duration-200 hover:border-pink-400/60 hover:bg-pink-200/60 md:flex"
          >
            <Sparkles className="h-4 w-4" />
            Ver packs
          </Link>

          <Link
            to="/carrinho"
            className="relative inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-pink-300 hover:bg-pink-50"
            aria-label="Abrir carrinho"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span>
            {cart.count > 0 ? (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-pink-500 px-1 text-[11px] font-black text-white">
                {cart.count}
              </span>
            ) : null}
          </Link>

          <div className="mx-2 h-6 w-px bg-pink-200"></div>

          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/pedidos" className="flex items-center gap-2 group">
                <img
                  src={user.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${user.user_metadata.full_name}&background=random`}
                  alt={user.user_metadata.full_name}
                  className="h-8 w-8 rounded-full border border-pink-200 transition-colors duration-150 group-hover:border-pink-400"
                />
                <span className="hidden md:block text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                  {user.user_metadata.full_name}
                </span>
              </Link>
              <button
                onClick={signOut}
                title="Sair"
                className="rounded-lg p-2 text-[rgb(var(--muted))] transition-colors duration-150 hover:bg-pink-100 hover:text-slate-700"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithDiscord}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5865F2] px-4 py-2 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#4752C4]"
            >
              Entrar com Discord
            </button>
          )}
        </div>
      </Container>
    </header>
  )
}
