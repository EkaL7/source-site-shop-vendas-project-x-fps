import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container } from '../components/Container'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Package, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

type Order = {
  id: string
  order_id: string
  created_at: string
  total_brl: number
  status: string
  items: any[]
}

export function Dashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const nav = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      nav('/')
    }
  }, [user, authLoading, nav])

  useEffect(() => {
    async function fetchOrders() {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setOrders(data || [])
      } catch (err) {
        console.error('Failed to fetch orders', err)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchOrders()
    }
  }, [user])

  if (authLoading || !user) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    )
  }

  return (
    <div className="py-10">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800">Meus Pedidos</h1>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            Acompanhe o histórico de produtos e otimizações adquiridas.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-[rgb(var(--muted))]">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando histórico...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-pink-200 bg-white/70 p-10 text-center glass">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-pink-500">
              <Package className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Nenhum pedido encontrado</h3>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              Você ainda não realizou nenhuma compra.
            </p>
            <Link
              to="/produtos"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-pink-500 px-5 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-pink-600"
            >
              Ver Produtos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-pink-200 bg-white/70 p-6 glass flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-bold text-slate-800">{order.order_id}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      <CheckCircle2 className="h-3 w-3" /> {order.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-[rgb(var(--muted))]">
                    Data: {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <div className="text-xs text-[rgb(var(--muted))]">Total pago</div>
                  <div className="text-xl font-black text-slate-800">R$ {order.total_brl.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </div>
  )
}
