'use client'

import { VideoCard } from './VideoCard'

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

interface VideoListProps {
  videos: Video[]
  onVideoClick?: (video: Video) => void
}

export function VideoList({ videos, onVideoClick }: VideoListProps) {
  if (videos.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🎬</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          まだ動画がありません
        </h3>
        <p className="text-gray-400">
          左側のフォームからテーマを入力して、最初の動画を作成しましょう！
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onClick={() => onVideoClick?.(video)}
        />
      ))}
    </div>
  )
}
