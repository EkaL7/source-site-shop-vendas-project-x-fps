import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import type { CartItem } from '../types'
import { getProductById } from '../data/products'

type CartState = {
  items: CartItem[]
}

type CartAction =
  | { type: 'add'; productId: string; qty?: number }
  | { type: 'remove'; productId: string }
  | { type: 'setQty'; productId: string; qty: number }
  | { type: 'clear' }
  | { type: 'hydrate'; state: CartState }

const STORAGE_KEY = 'kitty_cart_v1'

function clampQty(qty: number) {
  if (!Number.isFinite(qty)) return 1
  return Math.max(1, Math.min(99, Math.floor(qty)))
}

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'hydrate':
      return action.state
    case 'add': {
      const qty = clampQty(action.qty ?? 1)
      const existing = state.items.find((i) => i.productId === action.productId)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === action.productId ? { ...i, qty: clampQty(i.qty + qty) } : i,
          ),
        }
      }
      return { items: [...state.items, { productId: action.productId, qty }] }
    }
    case 'remove':
      return { items: state.items.filter((i) => i.productId !== action.productId) }
    case 'setQty':
      return {
        items: state.items.map((i) =>
          i.productId === action.productId ? { ...i, qty: clampQty(action.qty) } : i,
        ),
      }
    case 'clear':
      return { items: [] }
    default:
      return state
  }
}

type CartContextValue = {
  items: CartItem[]
  count: number
  subtotalBRL: number
  add: (productId: string, qty?: number) => void
  remove: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function loadInitial(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { items: [] }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return { items: [] }
    const items = (parsed as { items?: unknown }).items
    if (!Array.isArray(items)) return { items: [] }
    const cleaned: CartItem[] = items
      .filter((i) => i && typeof i === 'object')
      .map((i) => {
        const productId = (i as { productId?: unknown }).productId
        const qty = (i as { qty?: unknown }).qty
        if (typeof productId !== 'string') return null
        if (!getProductById(productId)) return null
        return { productId, qty: clampQty(typeof qty === 'number' ? qty : 1) }
      })
      .filter((v): v is CartItem => Boolean(v))
    return { items: cleaned }
  } catch {
    return { items: [] }
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Inicializa o reducer LENDO direto do localStorage — assim no primeiro
  // render já temos o state hidratado, sem race condition entre o hydrate
  // assíncrono (useEffect) e o save effect (que sobrescrevia com [] vazio).
  const [state, dispatch] = useReducer(reducer, null, () => loadInitial())
  const [hydrated, setHydrated] = useState(false)

  // Marca como hidratado depois do primeiro render — evita o save effect
  // gravar antes que o hydrate inicial seja considerado "intencional".
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Só persiste quando já passou pelo primeiro render hidratado.
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state, hydrated])

  const value = useMemo<CartContextValue>(() => {
    const count = state.items.reduce((acc, i) => acc + i.qty, 0)
    const subtotalBRL = state.items.reduce((acc, i) => {
      const p = getProductById(i.productId)
      return acc + (p ? p.priceBRL * i.qty : 0)
    }, 0)
    return {
      items: state.items,
      count,
      subtotalBRL,
      add: (productId, qty) => dispatch({ type: 'add', productId, qty }),
      remove: (productId) => dispatch({ type: 'remove', productId }),
      setQty: (productId, qty) => dispatch({ type: 'setQty', productId, qty }),
      clear: () => dispatch({ type: 'clear' }),
    }
  }, [state.items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider')
  return ctx
}

