// Stripe サーバーサイドクライアント
import Stripe from 'stripe'

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  })
}

// 遅延初期化
let _stripe: Stripe | null = null
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!_stripe) {
      _stripe = getStripeClient()
    }
    // eslint-disable-next-line
    return (_stripe as unknown as Record<string, unknown>)[prop as string]
  }
})
