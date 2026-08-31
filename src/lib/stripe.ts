import { loadStripe, type Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined
    if (!key) {
      console.error('[KittyFPS] VITE_STRIPE_PUBLISHABLE_KEY não configurada no .env')
      return Promise.resolve(null)
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}
