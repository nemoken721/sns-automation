'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap, ArrowUpRight } from 'lucide-react'

interface SubscriptionData {
  subscription: {
    credits_used: number
    credits_limit: number
    plan_id: string
    status: string
  } | null
  plan: {
    id: string
    name: string
    price: number
    limits?: {
      videosPerMonth: number
    }
  }
  canCreateVideo: boolean
  creditsRemaining: number
}

export function CreditStatus() {
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch('/api/subscription')
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubscription()
  }, [])

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
        <div className="h-6 bg-gray-700 rounded w-16"></div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const creditsUsed = data.subscription?.credits_used || 0
  const creditsLimit = data.subscription?.credits_limit || data.plan.limits?.videosPerMonth || 3
  const creditsRemaining = creditsLimit - creditsUsed
  const percentage = Math.min((creditsUsed / creditsLimit) * 100, 100)

  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <span className="text-gray-400 text-sm">今月の動画生成</span>
        </div>
        <Link
          href="/dashboard/settings/billing"
          className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
        >
          {data.plan.name}プラン
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-bold text-white">{creditsRemaining}</span>
        <span className="text-gray-400 text-sm mb-1">/ {creditsLimit} 本残り</span>
      </div>

      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            percentage >= 90
              ? 'bg-red-500'
              : percentage >= 70
              ? 'bg-yellow-500'
              : 'bg-purple-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {!data.canCreateVideo && (
        <div className="mt-3 p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-xs">
            クレジットを使い切りました。
            <Link href="/pricing" className="underline ml-1">
              アップグレード
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
