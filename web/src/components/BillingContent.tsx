'use client'

import { useState } from 'react'
import { CreditCard, Calendar, ArrowUpRight, Loader2 } from 'lucide-react'
import { Plan, PLANS } from '@/lib/stripe/config'
import Link from 'next/link'

interface Subscription {
  id: string
  plan_id: string
  status: string
  credits_used: number
  credits_limit: number
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_subscription_id: string | null
}

interface PaymentHistoryItem {
  id: string
  amount: number
  currency: string
  status: string
  description: string
  created_at: string
}

interface BillingContentProps {
  subscription: Subscription | null
  paymentHistory: PaymentHistoryItem[]
  currentPlan: Plan
}

export function BillingContent({ subscription, paymentHistory, currentPlan }: BillingContentProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleManageBilling = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const { url, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Portal error:', error)
      alert('エラーが発生しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  const creditsUsed = subscription?.credits_used || 0
  const creditsLimit = subscription?.credits_limit || currentPlan.limits.videosPerMonth
  const creditsPercentage = Math.min((creditsUsed / creditsLimit) * 100, 100)

  return (
    <div className="space-y-6">
      {/* 現在のプラン */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">現在のプラン</h2>
            <p className="text-gray-400">{currentPlan.description}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-white">{currentPlan.name}</span>
            <p className="text-gray-400">
              {currentPlan.price === 0 ? '無料' : `¥${currentPlan.price.toLocaleString()}/月`}
            </p>
          </div>
        </div>

        {subscription?.cancel_at_period_end && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm">
            このサブスクリプションは期間終了時にキャンセルされます。
          </div>
        )}

        {/* クレジット使用状況 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">今月の動画生成</span>
            <span className="text-white font-medium">
              {creditsUsed} / {creditsLimit} 本
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                creditsPercentage >= 90
                  ? 'bg-red-500'
                  : creditsPercentage >= 70
                  ? 'bg-yellow-500'
                  : 'bg-purple-500'
              }`}
              style={{ width: `${creditsPercentage}%` }}
            />
          </div>
        </div>

        {/* 次回請求日 */}
        {subscription?.current_period_end && (
          <div className="flex items-center gap-2 text-gray-400 mb-6">
            <Calendar className="w-4 h-4" />
            <span>
              次回請求日: {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
            </span>
          </div>
        )}

        <div className="flex gap-4">
          {subscription?.stripe_subscription_id && (
            <button
              onClick={handleManageBilling}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              支払い情報を管理
            </button>
          )}
          <Link
            href="/pricing"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            プランを変更
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* プラン比較 */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white mb-4">プラン比較</h2>
        <div className="grid grid-cols-3 gap-4">
          {Object.values(PLANS).map((plan) => (
            <div
              key={plan.id}
              className={`p-4 rounded-lg ${
                plan.id === currentPlan.id
                  ? 'bg-purple-600/20 border border-purple-500'
                  : 'bg-gray-700/50'
              }`}
            >
              <h3 className="text-white font-medium mb-1">{plan.name}</h3>
              <p className="text-2xl font-bold text-white mb-2">
                {plan.price === 0 ? '無料' : `¥${plan.price.toLocaleString()}`}
                {plan.price > 0 && <span className="text-sm text-gray-400">/月</span>}
              </p>
              <p className="text-gray-400 text-sm">
                月{plan.limits.videosPerMonth}本まで
              </p>
              {plan.id === currentPlan.id && (
                <span className="inline-block mt-2 px-2 py-1 bg-purple-500 text-white text-xs rounded">
                  現在のプラン
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 支払い履歴 */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white mb-4">支払い履歴</h2>
        {paymentHistory.length === 0 ? (
          <p className="text-gray-400">支払い履歴はありません。</p>
        ) : (
          <div className="space-y-3">
            {paymentHistory.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg"
              >
                <div>
                  <p className="text-white">{payment.description}</p>
                  <p className="text-gray-400 text-sm">
                    {new Date(payment.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">
                    ¥{payment.amount.toLocaleString()}
                  </p>
                  <p
                    className={`text-sm ${
                      payment.status === 'succeeded'
                        ? 'text-green-400'
                        : payment.status === 'failed'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    {payment.status === 'succeeded'
                      ? '完了'
                      : payment.status === 'failed'
                      ? '失敗'
                      : '処理中'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
