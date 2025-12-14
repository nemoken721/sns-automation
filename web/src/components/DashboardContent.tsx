'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon, LayoutGrid } from 'lucide-react'
import { Calendar } from './Calendar'
import { VideoList } from './VideoList'
import { VideoModal } from './VideoModal'

interface Video {
  id: string
  title: string
  theme: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url: string | null
  thumbnail_url: string | null
  caption: string | null
  created_at: string
  scheduled_at: string | null
  error_message?: string | null
}

interface DashboardContentProps {
  videos: Video[]
}

type ViewMode = 'calendar' | 'list'

export function DashboardContent({ videos }: DashboardContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)

  return (
    <>
      {/* ビュー切り替えタブ */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">作成した動画</h2>
        <div className="flex items-center bg-gray-700/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            カレンダー
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            リスト
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      {viewMode === 'calendar' ? (
        <Calendar videos={videos} onVideoClick={setSelectedVideo} />
      ) : (
        <VideoList videos={videos} onVideoClick={setSelectedVideo} />
      )}

      {/* 動画詳細モーダル */}
      {selectedVideo && (
        <VideoModal
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </>
  )
}
