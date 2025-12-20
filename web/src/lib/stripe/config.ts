// Stripe設定とプラン定義

export const PLANS = {
  FREE: {
    id: 'free',
    name: 'フリー',
    description: '個人利用に最適',
    price: 0,
    priceId: null, // 無料プランはStripe不要
    credits: 3, // 月3本まで
    features: [
      '月3本まで動画生成',
      '基本テンプレート',
      '720p画質',
      'ウォーターマーク付き',
    ],
    limits: {
      videosPerMonth: 3,
      maxDuration: 60, // 60秒
      resolution: '720p',
      hasWatermark: true,
      priority: 'low',
    },
  },
  STANDARD: {
    id: 'standard',
    name: 'スタンダード',
    description: '個人クリエイター向け',
    price: 9800,
    priceId: process.env.STRIPE_STANDARD_PRICE_ID || 'price_standard',
    credits: 30, // 月30本まで
    features: [
      '月30本まで動画生成',
      '全テンプレート利用可能',
      '1080p画質',
      'ウォーターマークなし',
      '優先処理',
      'Instagram/X直接投稿',
    ],
    limits: {
      videosPerMonth: 30,
      maxDuration: 180, // 3分
      resolution: '1080p',
      hasWatermark: false,
      priority: 'normal',
    },
  },
  PRO: {
    id: 'pro',
    name: 'プロ',
    description: 'チーム・企業向け',
    price: 29800,
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    credits: 100, // 月100本まで
    features: [
      '月100本まで動画生成',
      '全テンプレート利用可能',
      '4K画質対応',
      'ウォーターマークなし',
      '最優先処理',
      '全SNS直接投稿',
      'APIアクセス',
      '専用サポート',
    ],
    limits: {
      videosPerMonth: 100,
      maxDuration: 300, // 5分
      resolution: '4k',
      hasWatermark: false,
      priority: 'high',
    },
  },
} as const

export type PlanId = keyof typeof PLANS
export type Plan = typeof PLANS[PlanId]

export function getPlanById(planId: string): Plan | null {
  const upperPlanId = planId.toUpperCase() as PlanId
  return PLANS[upperPlanId] || null
}

export function getPlanByPriceId(priceId: string): Plan | null {
  return Object.values(PLANS).find(plan => plan.priceId === priceId) || null
}
