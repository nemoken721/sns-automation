import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserNav } from '@/components/UserNav'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Eye, Heart, MessageCircle, Share2, Bookmark, Play } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // プロフィール情報を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('ig_user_id, ig_username, ig_access_token')
    .eq('id', user.id)
    .single()

  const isInstagramConnected = profile?.ig_user_id && profile?.ig_access_token

  // 投稿済み動画を取得
  const { data: publishedVideos } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', user.id)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(10)

  // 統計サマリーを計算
  const totalVideos = publishedVideos?.length || 0
  const totalLikes = publishedVideos?.reduce((sum, v) => sum + (v.likes_count || 0), 0) || 0
  const totalComments = publishedVideos?.reduce((sum, v) => sum + (v.comments_count || 0), 0) || 0

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
            <h1 className="text-xl font-bold text-white">アナリティクス</h1>
          </div>
          <UserNav user={user} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!isInstagramConnected ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <TrendingUp className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Instagram連携が必要です
            </h2>
            <p className="text-gray-400 mb-6">
              アナリティクスを表示するには、Instagramアカウントを連携してください。
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors"
            >
              設定へ移動
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* アカウント概要 */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                @{profile.ig_username} のアカウント概要
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  icon={<Play className="w-6 h-6" />}
                  label="投稿動画数"
                  value={totalVideos.toString()}
                  color="purple"
                />
                <StatCard
                  icon={<Heart className="w-6 h-6" />}
                  label="総いいね数"
                  value={totalLikes.toLocaleString()}
                  color="pink"
                />
                <StatCard
                  icon={<MessageCircle className="w-6 h-6" />}
                  label="総コメント数"
                  value={totalComments.toLocaleString()}
                  color="blue"
                />
              </div>
            </div>

            {/* 投稿一覧 */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                投稿済み動画
              </h2>
              {publishedVideos && publishedVideos.length > 0 ? (
                <div className="space-y-4">
                  {publishedVideos.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg"
                    >
                      {/* サムネイル */}
                      <div className="w-20 h-20 bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* 情報 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">
                          {video.title}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {new Date(video.published_at).toLocaleDateString('ja-JP')} 投稿
                        </p>
                      </div>

                      {/* メトリクス */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1 text-gray-400">
                          <Eye className="w-4 h-4" />
                          <span>-</span>
                        </div>
                        <div className="flex items-center gap-1 text-pink-400">
                          <Heart className="w-4 h-4" />
                          <span>{video.likes_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-blue-400">
                          <MessageCircle className="w-4 h-4" />
                          <span>{video.comments_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-green-400">
                          <Share2 className="w-4 h-4" />
                          <span>{video.shares_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Bookmark className="w-4 h-4" />
                          <span>{video.saved_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>まだ投稿された動画はありません</p>
                </div>
              )}
            </div>
          </div>
        )}
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
  value: string
  color: 'purple' | 'pink' | 'blue' | 'green'
}) {
  const colorClasses = {
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400',
    pink: 'from-pink-500/20 to-pink-600/20 border-pink-500/30 text-pink-400',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400',
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-3">
        <div className={colorClasses[color]}>{icon}</div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}
