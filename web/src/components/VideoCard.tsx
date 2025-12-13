'use client'

import { Video } from '@/types/database'
import { useState } from 'react'

interface VideoCardProps {
  video: Video
}

const statusLabels: Record<Video['status'], { label: string; color: string }> = {
  pending: { label: '待機中', color: 'bg-yellow-500' },
  processing: { label: '生成中', color: 'bg-blue-500' },
  completed: { label: '完了', color: 'bg-green-500' },
  failed: { label: '失敗', color: 'bg-red-500' },
}

export function VideoCard({ video }: VideoCardProps) {
  const [showCaption, setShowCaption] = useState(false)
  const status = statusLabels[video.status]
  const createdAt = new Date(video.created_at).toLocaleString('ja-JP')

  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-start gap-4">
        {/* サムネイル */}
        <div className="w-32 h-56 bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* 情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`${status.color} text-white text-xs px-2 py-1 rounded`}>
              {status.label}
            </span>
            <span className="text-gray-500 text-xs">{createdAt}</span>
          </div>

          <h3 className="text-lg font-semibold text-white mb-1 truncate">
            {video.title}
          </h3>

          <p className="text-gray-400 text-sm mb-3 line-clamp-2">
            テーマ: {video.theme}
          </p>

          {video.status === 'failed' && video.error_message && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded mb-3">
              {video.error_message}
            </div>
          )}

          {video.status === 'processing' && (
            <div className="flex items-center gap-2 text-primary-400 text-sm mb-3">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
              生成処理中...
            </div>
          )}

          {video.status === 'completed' && (
            <div className="flex flex-wrap gap-2">
              {video.video_url && (
                <a
                  href={video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-primary-500 hover:bg-primary-600 text-white text-sm px-3 py-1.5 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  ダウンロード
                </a>
              )}

              {video.caption && (
                <button
                  onClick={() => setShowCaption(!showCaption)}
                  className="inline-flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  キャプション
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* キャプション表示 */}
      {showCaption && video.caption && (
        <div className="mt-4 bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">キャプション</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(video.caption!)
              }}
              className="text-xs text-primary-400 hover:text-primary-300"
            >
              コピー
            </button>
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{video.caption}</p>
        </div>
      )}
    </div>
  )
}
