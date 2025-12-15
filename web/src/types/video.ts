export interface Video {
  id: string
  title: string
  theme: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url: string | null
  thumbnail_url: string | null
  caption: string | null
  created_at: string
  scheduled_at: string | null
  published_at?: string | null
  ig_media_id?: string | null
  error_message?: string | null
}
