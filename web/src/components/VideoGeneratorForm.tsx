'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface VideoGeneratorFormProps {
  userId: string
}

export function VideoGeneratorForm({ userId }: VideoGeneratorFormProps) {
  const [theme, setTheme] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!theme.trim()) return

    setLoading(true)
    setError(null)
    setStatus('動画生成を開始しています...')

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme, userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '動画生成に失敗しました')
      }

      setStatus('動画生成リクエストを受け付けました')
      setTheme('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setLoading(false)
      setTimeout(() => setStatus(null), 3000)
    }
  }

  const examples = [
    '売上を2倍にする顧客心理学',
    '成功する起業家の5つの習慣',
    'SNSマーケティングの極意',
    'タイムマネジメント術',
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="theme" className="block text-sm font-medium text-gray-300 mb-2">
          動画のテーマ
        </label>
        <textarea
          id="theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="例: 売上を2倍にする顧客心理学"
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          rows={3}
          required
        />
      </div>

      <div>
        <p className="text-xs text-gray-400 mb-2">テーマ例:</p>
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setTheme(example)}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {status && !error && (
        <div className="bg-primary-500/10 border border-primary-500 text-primary-400 px-4 py-3 rounded-lg text-sm">
          {status}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !theme.trim()}
        className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            生成中...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            動画を生成
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        生成には数分かかる場合があります
      </p>
    </form>
  )
}
