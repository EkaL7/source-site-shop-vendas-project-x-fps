export type Platform = 'Android' | 'iOS' | 'PC'

export type ProductCategory =
  | 'Otimização FPS'
  | 'Packs OTM'
  | 'Sensibilidade'
  | 'Configs'
  | 'Regedit'

export type Product = {
  id: string
  slug: string
  name: string
  subtitle: string
  priceBRL: number
  category: ProductCategory
  platforms: Platform[]
  delivery: string
  highlights: string[]
  includes: string[]
  description: string
  popular?: boolean
}

export type CartItem = {
  productId: string
  qty: number
}

