import { createClient } from '@supabase/supabase-js'

// サーバーサイドで通知を作成するためのユーティリティ
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type NotificationType =
  | 'video_completed'
  | 'video_published'
  | 'video_failed'
  | 'token_expiring'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  videoId?: string
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  videoId,
}: CreateNotificationParams) {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        video_id: videoId || null,
      })

    if (error) {
      console.error('Failed to create notification:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Notification error:', error)
    return { success: false, error: 'Internal error' }
  }
}

// 動画生成完了通知
export async function notifyVideoCompleted(userId: string, videoId: string, videoTitle: string) {
  return createNotification({
    userId,
    type: 'video_completed',
    title: '動画生成完了',
    message: `「${videoTitle}」の生成が完了しました`,
    videoId,
  })
}

// 動画投稿完了通知
export async function notifyVideoPublished(userId: string, videoId: string, videoTitle: string) {
  return createNotification({
    userId,
    type: 'video_published',
    title: 'Instagram投稿完了',
    message: `「${videoTitle}」がInstagramに投稿されました`,
    videoId,
  })
}

// 動画生成失敗通知
export async function notifyVideoFailed(userId: string, videoId: string, videoTitle: string, errorMessage?: string) {
  return createNotification({
    userId,
    type: 'video_failed',
    title: '動画生成失敗',
    message: errorMessage || `「${videoTitle}」の生成に失敗しました`,
    videoId,
  })
}

// トークン期限切れ警告通知
export async function notifyTokenExpiring(userId: string, daysRemaining: number) {
  return createNotification({
    userId,
    type: 'token_expiring',
    title: 'Instagramトークン期限警告',
    message: `Instagramの連携が${daysRemaining}日後に切れます。設定から再連携してください。`,
  })
}
