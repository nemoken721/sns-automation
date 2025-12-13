'use client'

import { Video } from '@/types/database'
import { VideoCard } from './VideoCard'

interface VideoListProps {
  videos: Video[]
}

export function VideoList({ videos }: VideoListProps) {
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
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  )
}
