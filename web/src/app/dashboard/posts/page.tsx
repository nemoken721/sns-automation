'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'

interface InstagramPost {
  id: string
  status: string
  ig_media_id: string | null
  ig_permalink: string | null
  caption: string | null
  error_code: string | null
  error_message: string | null
  retry_count: number
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  videos: {
    id: string
    title: string
    thumbnail_url: string | null
    video_url: string | null
  } | null
}

export default function PostsPage() {
  const [posts, setPosts] = useState<InstagramPost[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchPosts()
  }, [filter])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const url = filter === 'all'
        ? '/api/instagram/posts?limit=50'
        : `/api/instagram/posts?limit=50&status=${filter}`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'pending':
      case 'uploading':
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待機中',
      uploading: 'アップロード中',
      processing: '処理中',
      published: '投稿完了',
      failed: '失敗'
    }
    return statusMap[status] || status
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500/20 text-green-400'
      case 'failed':
        return 'bg-red-500/20 text-red-400'
      case 'pending':
      case 'uploading':
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">Instagram 投稿履歴</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* フィルター */}
        <div className="flex gap-2 mb-6">
          {['all', 'published', 'pending', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f === 'all' ? 'すべて' : getStatusText(f)}
            </button>
          ))}
          <button
            onClick={fetchPosts}
            className="ml-auto px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
        </div>

        {/* 投稿リスト */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>投稿履歴がありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700"
              >
                <div className="flex gap-4">
                  {/* サムネイル */}
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-700 rounded-lg overflow-hidden">
                    {post.videos?.thumbnail_url ? (
                      <img
                        src={post.videos.thumbnail_url}
                        alt={post.videos.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* 詳細 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-white truncate">
                          {post.videos?.title || '無題'}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {post.caption || 'キャプションなし'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(post.status)}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(post.status)}`}>
                          {getStatusText(post.status)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-400">
                      <div>
                        <span className="text-gray-500">作成: </span>
                        {formatDate(post.created_at)}
                      </div>
                      {post.published_at && (
                        <div>
                          <span className="text-gray-500">投稿: </span>
                          {formatDate(post.published_at)}
                        </div>
                      )}
                      {post.scheduled_at && !post.published_at && (
                        <div>
                          <span className="text-gray-500">予定: </span>
                          {formatDate(post.scheduled_at)}
                        </div>
                      )}
                    </div>

                    {/* エラー情報 */}
                    {post.status === 'failed' && post.error_message && (
                      <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>{post.error_message}</span>
                        </div>
                        {post.retry_count > 0 && (
                          <p className="text-xs text-red-400/70 mt-1">
                            リトライ回数: {post.retry_count}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Instagramリンク */}
                    {post.ig_permalink && (
                      <div className="mt-3">
                        <a
                          href={post.ig_permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Instagramで見る
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
