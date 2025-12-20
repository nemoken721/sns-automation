import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { UserNav } from '@/components/UserNav'
import { BillingContent } from '@/components/BillingContent'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PLANS } from '@/lib/stripe/config'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // サブスクリプション情報を取得
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // 支払い履歴を取得
  const { data: paymentHistory } = await supabaseAdmin
    .from('payment_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const params = await searchParams
  const currentPlan = subscription?.plan_id
    ? PLANS[subscription.plan_id.toUpperCase() as keyof typeof PLANS] || PLANS.FREE
    : PLANS.FREE

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              設定
            </Link>
            <h1 className="text-xl font-bold text-white">請求管理</h1>
          </div>
          <UserNav user={user} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 成功メッセージ */}
        {params.success === 'true' && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">
            サブスクリプションが正常に開始されました！
          </div>
        )}

        {/* キャンセルメッセージ */}
        {params.canceled === 'true' && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400">
            決済がキャンセルされました。
          </div>
        )}

        <BillingContent
          subscription={subscription}
          paymentHistory={paymentHistory || []}
          currentPlan={currentPlan}
        />
      </main>
    </div>
  )
}
