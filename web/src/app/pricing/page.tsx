import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PLANS } from '@/lib/stripe/config'
import { PricingCard } from '@/components/PricingCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            SNS Automation
          </Link>
          <div>
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                ダッシュボード
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                ログイン
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            シンプルな料金プラン
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            あなたのニーズに合ったプランを選択してください。
            いつでもアップグレード・ダウングレードが可能です。
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <PricingCard
            plan={PLANS.FREE}
            isCurrentPlan={false}
            isLoggedIn={!!user}
          />
          <PricingCard
            plan={PLANS.STANDARD}
            isCurrentPlan={false}
            isLoggedIn={!!user}
            isPopular
          />
          <PricingCard
            plan={PLANS.PRO}
            isCurrentPlan={false}
            isLoggedIn={!!user}
          />
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            よくある質問
          </h2>
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-white font-medium mb-2">
                プランの変更はいつでもできますか？
              </h3>
              <p className="text-gray-400">
                はい、いつでもプランの変更が可能です。アップグレードの場合は即座に反映され、ダウングレードの場合は現在の請求期間の終了時に反映されます。
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-white font-medium mb-2">
                クレジットは翌月に繰り越せますか？
              </h3>
              <p className="text-gray-400">
                いいえ、クレジットは毎月リセットされます。未使用のクレジットは翌月に繰り越されません。
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-white font-medium mb-2">
                解約はいつでもできますか？
              </h3>
              <p className="text-gray-400">
                はい、いつでも解約可能です。解約後も請求期間の終了までサービスをご利用いただけます。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
