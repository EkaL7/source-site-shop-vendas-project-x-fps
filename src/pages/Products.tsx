import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Container } from '../components/Container'
import { products } from '../data/products'
import type { Platform, ProductCategory } from '../types'

const categories: (ProductCategory | 'Todos')[] = [
  'Todos',
  'Otimização FPS',
  'Packs OTM',
  'Sensibilidade',
  'Configs',
  'Regedit',
]

const platforms: (Platform | 'Todas')[] = ['Todas', 'Android', 'iOS', 'PC']

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1 text-xs font-bold transition-colors duration-150',
        active
          ? 'bg-pink-200/80 text-pink-700 ring-1 ring-pink-300/40'
          : 'bg-white/80 text-[rgb(var(--muted))] ring-1 ring-pink-200 hover:bg-pink-50/80 hover:text-pink-700',
      ].join(' ')}
      type="button"
    >
      {children}
    </button>
  )
}

export function Products() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<(typeof categories)[number]>('Todos')
  const [plat, setPlat] = useState<(typeof platforms)[number]>('Todas')

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return products.filter((p) => {
      if (cat !== 'Todos' && p.category !== cat) return false
      if (plat !== 'Todas' && !p.platforms.includes(plat)) return false
      if (!qq) return true
      return (
        p.name.toLowerCase().includes(qq) ||
        p.subtitle.toLowerCase().includes(qq) ||
        p.category.toLowerCase().includes(qq) ||
        p.platforms.join(' ').toLowerCase().includes(qq)
      )
    })
  }, [q, cat, plat])

  return (
    <div className="py-10">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold text-pink-600">Produtos</div>
            <h1 className="mt-1 text-3xl font-black text-slate-800">Escolha seu pacote</h1>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              Otimização simples/avançada, packs de sensi/configs e ajustes para PC.
            </p>
          </div>

          <div className="glass flex w-full flex-col gap-3 rounded-2xl p-4 md:w-[440px]">
            <div className="flex items-center gap-2 rounded-xl border border-pink-200 bg-white/70 px-3 py-2">
              <Search className="h-4 w-4 text-[rgb(var(--muted))]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar: otm, sensi, ios, pc..."
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-[rgb(var(--muted))]">
              <SlidersHorizontal className="h-4 w-4" />
              Filtrar por categoria e plataforma
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                  {c}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <Chip key={p} active={plat === p} onClick={() => setPlat(p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/produtos/${p.slug}`}
              className="glass shine rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_52px_rgba(244,114,182,0.22)]"
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
                {p.platforms.map((pl) => (
                  <span
                    key={pl}
                    className="rounded-full border border-pink-200 bg-white/70 px-3 py-1 text-xs text-slate-700"
                  >
                    {pl}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-pink-200/60 pt-4">
                <div className="text-sm text-[rgb(var(--muted))]">{p.delivery}</div>
                <div className="text-xl font-black text-slate-800">R$ {p.priceBRL}</div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-pink-200 bg-white/70 p-6 text-sm text-[rgb(var(--muted))]">
            Nada encontrado. Tente outro termo ou limpe os filtros.
          </div>
        ) : null}
      </Container>
    </div>
  )
}
