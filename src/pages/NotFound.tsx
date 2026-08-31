import { Link } from 'react-router-dom'
import { Container } from '../components/Container'

export function NotFound() {
  return (
    <div className="py-16">
      <Container>
        <div className="glass rounded-3xl p-8 text-center">
          <div className="text-2xl font-black text-slate-800">404</div>
          <div className="mt-2 text-sm text-[rgb(var(--muted))]">Página não encontrada.</div>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-pink-500 to-pink-400 px-5 py-3 text-sm font-black text-white shadow-[0_14px_36px_rgba(236,72,153,0.28)] transition-all duration-200 hover:from-pink-600 hover:to-pink-500"
          >
            Voltar ao início
          </Link>
        </div>
      </Container>
    </div>
  )
}
