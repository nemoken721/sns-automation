import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VideoGeneratorForm } from '@/components/VideoGeneratorForm'
import { VideoList } from '@/components/VideoList'
import { UserNav } from '@/components/UserNav'

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
          <UserNav user={user} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 動画生成フォーム */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl sticky top-24">
              <h2 className="text-xl font-semibold text-white mb-4">
                新しい動画を作成
              </h2>
              <VideoGeneratorForm userId={user.id} />
            </div>
          </div>

          {/* 動画一覧 */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">
              作成した動画
            </h2>
            <VideoList videos={videos || []} />
          </div>
        </div>
      </main>
    </div>
  )
}
