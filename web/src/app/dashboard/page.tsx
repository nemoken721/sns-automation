import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VideoGeneratorForm } from '@/components/VideoGeneratorForm'
import { DashboardContent } from '@/components/DashboardContent'
import { UserNav } from '@/components/UserNav'
import { NotificationBell } from '@/components/NotificationBell'
import Link from 'next/link'
import { TrendingUp, Settings, Instagram } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザーの動画一覧を取得
  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">SNS Automation</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/posts"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <Instagram className="w-5 h-5" />
              <span className="hidden sm:inline">投稿履歴</span>
            </Link>
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <TrendingUp className="w-5 h-5" />
              <span className="hidden sm:inline">アナリティクス</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline">設定</span>
            </Link>
            <NotificationBell />
            <UserNav user={user} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* 動画生成フォーム */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl sticky top-24">
              <h2 className="text-xl font-semibold text-white mb-4">
                新しい動画を作成
              </h2>
              <VideoGeneratorForm userId={user.id} />
            </div>
          </div>

          {/* カレンダー/リスト表示 */}
          <div className="lg:col-span-3">
            <DashboardContent videos={videos || []} />
          </div>
        </div>
      </main>
    </div>
  )
}
