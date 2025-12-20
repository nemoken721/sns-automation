'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Plan } from '@/lib/stripe/config'
import { getStripe } from '@/lib/stripe/client'

interface PricingCardProps {
  plan: Plan
  isCurrentPlan?: boolean
  isLoggedIn?: boolean
  isPopular?: boolean
}

export function PricingCard({ plan, isCurrentPlan, isLoggedIn, isPopular }: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscribe = async () => {
    if (!isLoggedIn) {
      window.location.href = '/login?redirect=/pricing'
      return
    }

    if (plan.id === 'free') {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      })

      const { url, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('エラーが発生しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`relative bg-gray-800 rounded-2xl p-8 ${
        isPopular ? 'ring-2 ring-purple-500' : ''
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            人気
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
        <p className="text-gray-400">{plan.description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold text-white">
          {plan.price === 0 ? '無料' : `¥${plan.price.toLocaleString()}`}
        </span>
        {plan.price > 0 && <span className="text-gray-400">/月</span>}
      </div>

      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <span className="text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleSubscribe}
        disabled={isLoading || isCurrentPlan || plan.id === 'free'}
        className={`w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isPopular
            ? 'bg-purple-600 text-white hover:bg-purple-700'
            : plan.id === 'free'
            ? 'bg-gray-700 text-gray-400 cursor-default'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : isCurrentPlan ? (
          '現在のプラン'
        ) : plan.id === 'free' ? (
          '無料プラン'
        ) : (
          'このプランを選択'
        )}
      </button>
    </div>
  )
}
