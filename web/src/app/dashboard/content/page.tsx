import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserNav } from '@/components/UserNav'
import { ContentCalendar } from '@/components/ContentCalendar'
import { ContentGenerateButton } from '@/components/ContentGenerateButton'
import Link from 'next/link'
import { ArrowLeft, Calendar, Sparkles, FileText, Video, CheckCircle } from 'lucide-react'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 今月のコンテンツアイデアを取得
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: ideas } = await supabase
    .from('content_ideas')
    .select(`
      *,
      videos (
        id,
        title,
        status,
        video_url,
        thumbnail_url
      )
    `)
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: true })

  // 統計情報
  const stats = {
    total: ideas?.length || 0,
    draft: ideas?.filter(i => i.status === 'draft').length || 0,
    scheduled: ideas?.filter(i => i.status === 'scheduled').length || 0,
    generating: ideas?.filter(i => i.status === 'generating').length || 0,
    generated: ideas?.filter(i => i.status === 'generated').length || 0,
    published: ideas?.filter(i => i.status === 'published').length || 0,
  }

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
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              コンテンツカレンダー
            </h1>
          </div>
          <UserNav user={user} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            label="全アイデア"
            value={stats.total}
            color="gray"
          />
          <StatCard
            icon={<Sparkles className="w-5 h-5" />}
            label="下書き"
            value={stats.draft}
            color="yellow"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="予約済み"
            value={stats.scheduled}
            color="blue"
          />
          <StatCard
            icon={<Video className="w-5 h-5" />}
            label="動画生成済み"
            value={stats.generated}
            color="purple"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="投稿完了"
            value={stats.published}
            color="green"
          />
        </div>

        {/* アクションボタン */}
        <div className="flex flex-wrap gap-4 mb-8">
          <ContentGenerateButton userId={user.id} />
        </div>

        {/* コンテンツカレンダー/リスト */}
        <ContentCalendar ideas={ideas || []} userId={user.id} />
      </main>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'gray' | 'yellow' | 'blue' | 'purple' | 'green'
}) {
  const colorClasses = {
    gray: 'bg-gray-700/50 border-gray-600 text-gray-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
  }

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}
