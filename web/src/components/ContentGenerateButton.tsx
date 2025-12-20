'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, Calendar, X } from 'lucide-react'

interface ContentGenerateButtonProps {
  userId: string
}

export function ContentGenerateButton({ userId }: ContentGenerateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [count, setCount] = useState(7)
  const [categories, setCategories] = useState<string[]>(['ビジネス', 'マーケティング', '自己啓発'])
  const [targetAudience, setTargetAudience] = useState('20-40代のビジネスパーソン')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()

  const categoryOptions = [
    'ビジネス',
    'マーケティング',
    '自己啓発',
    '生産性',
    'リーダーシップ',
    '営業',
    '起業',
    'キャリア',
    'お金',
    'テクノロジー',
  ]

  const toggleCategory = (category: string) => {
    if (categories.includes(category)) {
      setCategories(categories.filter(c => c !== category))
    } else {
      setCategories([...categories, category])
    }
  }

  const handleGenerate = async () => {
    if (categories.length === 0) {
      setMessage({ type: 'error', text: 'カテゴリを1つ以上選択してください' })
      return
    }

    setIsGenerating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/content/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count,
          categories,
          targetAudience,
          startDate: new Date().toISOString(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        setTimeout(() => {
          setIsOpen(false)
          router.refresh()
        }, 1500)
      } else {
        setMessage({ type: 'error', text: data.error || '生成に失敗しました' })
      }
    } catch (error) {
      console.error('Generate error:', error)
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-colors"
      >
        <Sparkles className="w-5 h-5" />
        AIでネタを一括生成
      </button>

      {/* モーダル */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                コンテンツアイデアを生成
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="p-4 space-y-6">
              {/* 生成数 */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  生成するアイデアの数
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="31"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="flex-1 accent-purple-500"
                  />
                  <span className="text-white font-medium w-12 text-center">{count}件</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1週間分</span>
                  <span>1ヶ月分</span>
                </div>
              </div>

              {/* カテゴリ */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  カテゴリ（複数選択可）
                </label>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        categories.includes(category)
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* ターゲット */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  ターゲット層
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="例: 20-40代のビジネスパーソン"
                />
              </div>

              {/* メッセージ */}
              {message && (
                <div className={`p-3 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  {message.text}
                </div>
              )}

              {/* 生成ボタン */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || categories.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    AIが生成中... (数秒かかります)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {count}件のアイデアを生成
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                生成されたアイデアは下書きとして保存され、後から編集・スケジュールできます
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
