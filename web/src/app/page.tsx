import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            SNS Automation
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            AIを活用してInstagram Reels用の動画を自動生成。
            テーマを入力するだけで、台本・画像・ナレーション・動画を一括生成します。
          </p>

          {user ? (
            <Link
              href="/dashboard"
              className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-lg"
            >
              ダッシュボードへ
            </Link>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link
                href="/login"
                className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-lg"
              >
                ログイン
              </Link>
              <Link
                href="/signup"
                className="inline-block bg-gray-700 hover:bg-gray-600 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-lg"
              >
                新規登録
              </Link>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-gray-800 p-6 rounded-xl">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-white mb-2">AI台本生成</h3>
            <p className="text-gray-400">
              Gemini AIがテーマに基づいて魅力的な台本を自動生成
            </p>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-white mb-2">画像生成</h3>
            <p className="text-gray-400">
              DALL-E 3が各スライドの背景画像を自動生成
            </p>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl">
            <div className="text-4xl mb-4">🎙️</div>
            <h3 className="text-xl font-semibold text-white mb-2">音声合成</h3>
            <p className="text-gray-400">
              Fish Audioで自然な日本語ナレーションを生成
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">使い方</h2>
          <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
              <span className="text-gray-300">テーマを入力</span>
            </div>
            <div className="hidden md:block text-gray-500">→</div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold">2</div>
              <span className="text-gray-300">AIが自動生成</span>
            </div>
            <div className="hidden md:block text-gray-500">→</div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold">3</div>
              <span className="text-gray-300">動画をダウンロード</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
