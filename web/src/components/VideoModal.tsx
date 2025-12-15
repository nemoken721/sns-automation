'use client'

import { useState } from 'react'
import { X, Download, Play, Pause, CheckCircle, XCircle, Clock, Loader2, Copy, Check, ExternalLink, Instagram, Send } from 'lucide-react'
import { Video } from '@/types/video'

interface VideoModalProps {
  video: Video
  onClose: () => void
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
          <CheckCircle className="w-4 h-4" />
          完了
        </span>
      )
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          生成中
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
          <XCircle className="w-4 h-4" />
          失敗
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
          <Clock className="w-4 h-4" />
          予定
        </span>
      )
  }
}

export function VideoModal({ video, onClose }: VideoModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState(false)

  const handleDownload = async () => {
    if (!video.video_url) return

    try {
      const response = await fetch(video.video_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${video.title}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleCopyCaption = () => {
    if (!video.caption) return

    navigator.clipboard.writeText(video.caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handlePublishToInstagram = async () => {
    if (!video.video_url || video.published_at) return

    setIsPublishing(true)
    setPublishError(null)

    try {
      const response = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        setPublishError(data.error || '投稿に失敗しました')
        return
      }

      setPublishSuccess(true)
      // 3秒後にリロード
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } catch (error) {
      console.error('Publish error:', error)
      setPublishError('ネットワークエラーが発生しました')
    } finally {
      setIsPublishing(false)
    }
  }

  const isPublished = !!video.published_at

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="relative bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">{video.title}</h2>
            {getStatusBadge(video.status)}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="grid md:grid-cols-2 gap-6 p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* 左側：動画プレビュー */}
          <div className="space-y-4">
            <div className="aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden relative">
              {video.status === 'completed' && video.video_url ? (
                <video
                  src={video.video_url}
                  poster={video.thumbnail_url || undefined}
                  controls
                  className="w-full h-full object-contain"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : video.status === 'processing' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-400">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p className="text-lg font-medium">動画を生成中...</p>
                  <p className="text-sm text-gray-400 mt-2">しばらくお待ちください</p>
                </div>
              ) : video.status === 'failed' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400">
                  <XCircle className="w-12 h-12 mb-4" />
                  <p className="text-lg font-medium">生成に失敗しました</p>
                  {video.error_message && (
                    <p className="text-sm text-gray-400 mt-2 px-4 text-center">
                      {video.error_message}
                    </p>
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-yellow-400">
                  <Clock className="w-12 h-12 mb-4" />
                  <p className="text-lg font-medium">投稿予定</p>
                </div>
              )}
            </div>

            {/* アクションボタン */}
            {video.status === 'completed' && video.video_url && (
              <div className="space-y-3">
                {/* Instagram投稿ボタン */}
                {publishSuccess ? (
                  <div className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    投稿完了！リロードしています...
                  </div>
                ) : isPublished ? (
                  <div className="flex items-center justify-center gap-2 py-3 bg-gray-600 text-gray-300 rounded-lg cursor-not-allowed">
                    <Instagram className="w-5 h-5" />
                    投稿済み
                  </div>
                ) : (
                  <button
                    onClick={handlePublishToInstagram}
                    disabled={isPublishing}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Instagram に投稿中...
                      </>
                    ) : (
                      <>
                        <Instagram className="w-5 h-5" />
                        Instagram に投稿
                      </>
                    )}
                  </button>
                )}

                {/* エラーメッセージ */}
                {publishError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {publishError}
                  </div>
                )}

                {/* ダウンロード・外部リンク */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    ダウンロード
                  </button>
                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* 右側：詳細情報 */}
          <div className="space-y-6">
            {/* テーマ */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                テーマ
              </label>
              <p className="text-white bg-gray-700/50 rounded-lg p-3">
                {video.theme}
              </p>
            </div>

            {/* キャプション */}
            {video.caption && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-400">
                    キャプション
                  </label>
                  <button
                    onClick={handleCopyCaption}
                    className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        コピー済み
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        コピー
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <p className="text-white whitespace-pre-wrap text-sm">
                    {video.caption}
                  </p>
                </div>
              </div>
            )}

            {/* 日時情報 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  作成日時
                </label>
                <p className="text-white text-sm">
                  {formatDate(video.created_at)}
                </p>
              </div>
              {video.scheduled_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    投稿予定日時
                  </label>
                  <p className="text-white text-sm">
                    {formatDate(video.scheduled_at)}
                  </p>
                </div>
              )}
              {video.published_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    投稿日時
                  </label>
                  <p className="text-green-400 text-sm">
                    {formatDate(video.published_at)}
                  </p>
                </div>
              )}
            </div>

            {/* 動画ID */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                動画ID
              </label>
              <p className="text-gray-500 text-xs font-mono bg-gray-700/50 rounded-lg p-2">
                {video.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
