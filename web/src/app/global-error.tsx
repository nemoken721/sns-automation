'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              エラーが発生しました
            </h1>
            <p className="text-gray-400 mb-8">
              申し訳ございません。予期せぬエラーが発生しました。
              <br />
              問題が解決しない場合は、サポートまでお問い合わせください。
            </p>
            <button
              onClick={() => reset()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              もう一度試す
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
