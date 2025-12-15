import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserNav } from '@/components/UserNav'
import { InstagramConnect } from '@/components/InstagramConnect'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string; detail?: string; debug?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // プロフィール情報を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const params = await searchParams

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
            <h1 className="text-xl font-bold text-white">設定</h1>
          </div>
          <UserNav user={user} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 成功メッセージ */}
        {params.success === 'instagram_connected' && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">
            Instagramアカウントが正常に連携されました！
          </div>
        )}

        {/* エラーメッセージ */}
        {params.error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {params.error === 'instagram_denied' && 'Instagram連携がキャンセルされました。'}
            {params.error === 'no_pages' && (
              <div>
                <p>Facebookページが見つかりません。Facebookページを作成してください。</p>
                {params.debug && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">デバッグ情報</summary>
                    <pre className="mt-2 text-xs bg-gray-900 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(JSON.parse(decodeURIComponent(params.debug)), null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
            {params.error === 'no_ig_business' && 'Instagramビジネスアカウントが見つかりません。InstagramアカウントをFacebookページに連携してください。'}
            {params.error === 'token_exchange_failed' && `トークンの取得に失敗しました。${params.detail ? `詳細: ${params.detail}` : ''}`}
            {params.error === 'long_token_failed' && `長期トークンの取得に失敗しました。${params.detail ? `詳細: ${params.detail}` : ''}`}
            {params.error === 'pages_failed' && 'Facebookページの取得に失敗しました。'}
            {params.error === 'ig_account_failed' && 'Instagramアカウントの取得に失敗しました。'}
            {params.error === 'save_failed' && 'データの保存に失敗しました。'}
            {params.error === 'unknown' && 'エラーが発生しました。もう一度お試しください。'}
          </div>
        )}

        <div className="space-y-6">
          {/* Instagram連携 */}
          <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4">
              Instagram連携
            </h2>
            <p className="text-gray-400 mb-6">
              Instagramビジネスアカウントを連携すると、動画を直接Instagramに投稿できます。
            </p>
            <InstagramConnect profile={profile} />
          </div>

          {/* アカウント情報 */}
          <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4">
              アカウント情報
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  メールアドレス
                </label>
                <p className="text-white">{user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  ユーザーID
                </label>
                <p className="text-gray-500 text-sm font-mono">{user.id}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
