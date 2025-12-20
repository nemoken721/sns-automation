import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/AdminDashboard'
import { UserNav } from '@/components/UserNav'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 管理者チェック
  const { data: adminUser } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!adminUser) {
    redirect('/dashboard')
  }

  // 統計情報を取得
  const [
    { count: totalUsers },
    { count: totalVideos },
    { data: recentSubscriptions },
    { data: recentPayments },
    { data: videoStats },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('videos').select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('subscriptions')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('payment_history')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('videos')
      .select('status')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  // 今日のサブスクリプション収益を計算
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data: todayPayments } = await supabaseAdmin
    .from('payment_history')
    .select('amount')
    .gte('created_at', today.toISOString())
    .eq('status', 'succeeded')

  const todayRevenue = todayPayments?.reduce((sum, p) => sum + p.amount, 0) || 0

  // プラン別ユーザー数
  const { data: planStats } = await supabaseAdmin
    .from('subscriptions')
    .select('plan_id')

  const planCounts = planStats?.reduce((acc, s) => {
    acc[s.plan_id] = (acc[s.plan_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // ビデオステータス集計
  const statusCounts = videoStats?.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              ダッシュボード
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              <h1 className="text-xl font-bold text-white">管理者ダッシュボード</h1>
            </div>
          </div>
          <UserNav user={user} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <AdminDashboard
          stats={{
            totalUsers: totalUsers || 0,
            totalVideos: totalVideos || 0,
            todayRevenue,
            planCounts,
            statusCounts,
          }}
          recentSubscriptions={recentSubscriptions || []}
          recentPayments={recentPayments || []}
          adminRole={adminUser.role}
        />
      </main>
    </div>
  )
}
