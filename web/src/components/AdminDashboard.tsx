'use client'

import { Users, Video, DollarSign, TrendingUp, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

interface AdminDashboardProps {
  stats: {
    totalUsers: number
    totalVideos: number
    todayRevenue: number
    planCounts: Record<string, number>
    statusCounts: Record<string, number>
  }
  recentSubscriptions: Array<{
    id: string
    plan_id: string
    status: string
    created_at: string
    profiles: { email: string } | null
  }>
  recentPayments: Array<{
    id: string
    amount: number
    status: string
    description: string
    created_at: string
    profiles: { email: string } | null
  }>
  adminRole: string
}

const planLabels: Record<string, string> = {
  free: 'フリー',
  pro: 'プロ',
  business: 'ビジネス',
}

const statusLabels: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  completed: { label: '完了', icon: CheckCircle },
  processing: { label: '処理中', icon: Clock },
  pending: { label: '待機中', icon: AlertCircle },
  failed: { label: '失敗', icon: XCircle },
}

export function AdminDashboard({ stats, recentSubscriptions, recentPayments, adminRole }: AdminDashboardProps) {
  return (
    <div className="space-y-8">
      {/* 概要カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="総ユーザー数"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="総動画数"
          value={stats.totalVideos.toLocaleString()}
          icon={Video}
          color="purple"
        />
        <StatCard
          title="本日の収益"
          value={`¥${stats.todayRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="有料プラン"
          value={`${(stats.planCounts['pro'] || 0) + (stats.planCounts['business'] || 0)}人`}
          icon={TrendingUp}
          color="yellow"
        />
      </div>

      {/* プラン分布 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">プラン分布</h2>
          <div className="space-y-4">
            {Object.entries(planLabels).map(([planId, label]) => {
              const count = stats.planCounts[planId] || 0
              const total = Object.values(stats.planCounts).reduce((a, b) => a + b, 0) || 1
              const percentage = Math.round((count / total) * 100)

              return (
                <div key={planId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-white font-medium">{count}人 ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        planId === 'free'
                          ? 'bg-gray-500'
                          : planId === 'pro'
                          ? 'bg-purple-500'
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">動画ステータス（直近100件）</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(statusLabels).map(([status, { label, icon: Icon }]) => {
              const count = stats.statusCounts[status] || 0
              return (
                <div
                  key={status}
                  className={`p-4 rounded-lg ${
                    status === 'completed'
                      ? 'bg-green-500/10'
                      : status === 'processing'
                      ? 'bg-blue-500/10'
                      : status === 'pending'
                      ? 'bg-yellow-500/10'
                      : 'bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      className={`w-4 h-4 ${
                        status === 'completed'
                          ? 'text-green-400'
                          : status === 'processing'
                          ? 'text-blue-400'
                          : status === 'pending'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    />
                    <span className="text-gray-400 text-sm">{label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{count}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 最近のサブスクリプション・支払い */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">最近のサブスクリプション</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentSubscriptions.length === 0 ? (
              <p className="text-gray-500">データがありません</p>
            ) : (
              recentSubscriptions.map(sub => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div>
                    <p className="text-white text-sm">{sub.profiles?.email || '不明'}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(sub.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        sub.plan_id === 'pro'
                          ? 'bg-purple-500/30 text-purple-300'
                          : sub.plan_id === 'business'
                          ? 'bg-yellow-500/30 text-yellow-300'
                          : 'bg-gray-500/30 text-gray-300'
                      }`}
                    >
                      {planLabels[sub.plan_id] || sub.plan_id}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">最近の支払い</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentPayments.length === 0 ? (
              <p className="text-gray-500">データがありません</p>
            ) : (
              recentPayments.map(payment => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div>
                    <p className="text-white text-sm">{payment.profiles?.email || '不明'}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(payment.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">¥{payment.amount.toLocaleString()}</p>
                    <span
                      className={`text-xs ${
                        payment.status === 'succeeded'
                          ? 'text-green-400'
                          : payment.status === 'failed'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {payment.status === 'succeeded'
                        ? '成功'
                        : payment.status === 'failed'
                        ? '失敗'
                        : '処理中'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 管理者情報 */}
      <div className="bg-gray-800/50 rounded-xl p-4 text-center text-gray-500 text-sm">
        管理者ロール: {adminRole === 'super_admin' ? 'スーパー管理者' : '管理者'}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'purple' | 'green' | 'yellow'
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400">{title}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  )
}
