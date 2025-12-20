'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Play,
  Edit,
  Trash2,
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Eye
} from 'lucide-react'

interface ContentIdea {
  id: string
  title: string
  hook: string | null
  main_points: string[] | null
  call_to_action: string | null
  hashtags: string[] | null
  category: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  status: string
  video_id: string | null
  videos?: {
    id: string
    title: string
    status: string
    video_url: string | null
    thumbnail_url: string | null
  } | null
  created_at: string
}

interface ContentCalendarProps {
  ideas: ContentIdea[]
  userId: string
}

export function ContentCalendar({ ideas, userId }: ContentCalendarProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  // 処理中の動画がある場合、定期的にリフレッシュ
  const hasProcessingVideos = ideas.some(idea => idea.status === 'generating')

  useEffect(() => {
    if (!hasProcessingVideos) return

    const interval = setInterval(() => {
      router.refresh()
    }, 10000) // 10秒ごとにリフレッシュ

    return () => clearInterval(interval)
  }, [hasProcessingVideos, router])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      draft: { label: '下書き', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <Edit className="w-3 h-3" /> },
      scheduled: { label: '予約済み', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Clock className="w-3 h-3" /> },
      generating: { label: '動画生成中', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      generated: { label: '動画生成済み', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <Video className="w-3 h-3" /> },
      published: { label: '投稿完了', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle className="w-3 h-3" /> },
      failed: { label: '失敗', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <AlertCircle className="w-3 h-3" /> },
    }

    const config = statusConfig[status] || statusConfig.draft

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    )
  }

  const handleGenerateVideo = async (idea: ContentIdea) => {
    if (!confirm(`「${idea.title}」の動画を生成しますか？`)) return

    setIsGeneratingVideo(idea.id)

    try {
      // 動画生成APIを呼び出し
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: idea.title,
          userId: userId,
        }),
      })

      if (!response.ok) {
        throw new Error('動画生成に失敗しました')
      }

      const result = await response.json()
      const videoId = result.videoId

      // ステータスを更新し、video_idを紐付け
      await fetch('/api/content/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: idea.id,
          status: 'generating',
          video_id: videoId,
        }),
      })

      // 動画生成はバックグラウンドで実行されるため、すぐに完了通知
      alert('動画生成を開始しました。完了までしばらくお待ちください。')
      router.refresh()
    } catch (error) {
      console.error('Generate video error:', error)
      alert('動画生成リクエストに失敗しました')

      // ステータスをdraftに戻す
      await fetch('/api/content/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idea.id, status: 'draft' }),
      })
    } finally {
      setIsGeneratingVideo(null)
    }
  }

  const handleDelete = async (idea: ContentIdea) => {
    if (!confirm(`「${idea.title}」を削除しますか？`)) return

    try {
      await fetch(`/api/content/ideas?id=${idea.id}`, {
        method: 'DELETE',
      })
      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      alert('削除に失敗しました')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未設定'
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    })
  }

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">
            コンテンツアイデア ({ideas.length}件)
          </h2>
          {hasProcessingVideos && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              動画生成中...（自動更新）
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50"
            title="最新状態に更新"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'calendar'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      {ideas.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="mb-2">まだコンテンツアイデアがありません</p>
          <p className="text-sm">「AIでネタを一括生成」ボタンからアイデアを生成しましょう</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="divide-y divide-gray-700">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="p-4 hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* サムネイル/プレースホルダー */}
                <div className="w-16 h-16 bg-gray-700 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {idea.videos?.thumbnail_url ? (
                    <img
                      src={idea.videos.thumbnail_url}
                      alt={idea.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Video className="w-6 h-6 text-gray-500" />
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-white font-medium truncate">{idea.title}</h3>
                      <p className="text-sm text-gray-400 truncate mt-0.5">{idea.hook}</p>
                    </div>
                    {getStatusBadge(idea.status)}
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(idea.scheduled_date)}
                    </span>
                    {idea.category && (
                      <span className="bg-gray-700 px-2 py-0.5 rounded">
                        {idea.category}
                      </span>
                    )}
                  </div>

                  {/* ハッシュタグ */}
                  {idea.hashtags && idea.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {idea.hashtags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs text-purple-400">
                          {tag}
                        </span>
                      ))}
                      {idea.hashtags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{idea.hashtags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* アクション */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {idea.status === 'draft' && (
                    <button
                      onClick={() => handleGenerateVideo(idea)}
                      disabled={isGeneratingVideo === idea.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50"
                    >
                      {isGeneratingVideo === idea.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      動画生成
                    </button>
                  )}
                  {idea.status === 'generating' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>生成中...</span>
                    </div>
                  )}
                  {(idea.status === 'generated' || idea.videos?.video_url) && (
                    <div className="flex items-center gap-1">
                      <a
                        href={`/dashboard/video/${idea.video_id || idea.videos?.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm rounded-lg transition-colors border border-green-500/30"
                      >
                        <Eye className="w-4 h-4" />
                        動画を見る
                      </a>
                      {idea.videos?.video_url && (
                        <a
                          href={idea.videos.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                          title="新しいタブで開く"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                  {idea.status === 'failed' && (
                    <button
                      onClick={() => handleGenerateVideo(idea)}
                      disabled={isGeneratingVideo === idea.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors border border-red-500/30"
                    >
                      <RefreshCw className="w-4 h-4" />
                      再試行
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(idea)}
                    className="p-2 bg-gray-700 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <p className="text-gray-400 text-center">カレンダービューは準備中です</p>
        </div>
      )}
    </div>
  )
}
