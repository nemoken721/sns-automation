import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyVideoPublished } from '@/lib/notifications'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// Vercel Cron認証用
const CRON_SECRET = process.env.CRON_SECRET

// Supabaseサービスロールクライアント
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Vercel Cronから呼び出される自動投稿API
export async function GET(request: NextRequest) {
  try {
    // Cron認証（Vercelからの呼び出しを検証）
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    console.log(`[Cron] Running scheduled publish check at ${now.toISOString()}`)

    // 投稿予定時刻が過ぎた、未投稿の完了済み動画を取得
    const { data: scheduledVideos, error: fetchError } = await supabaseAdmin
      .from('videos')
      .select(`
        id,
        title,
        video_url,
        caption,
        scheduled_at,
        user_id,
        profiles!inner (
          ig_user_id,
          ig_access_token
        )
      `)
      .eq('status', 'completed')
      .is('published_at', null)
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now.toISOString())
      .limit(10) // 一度に処理する最大数

    if (fetchError) {
      console.error('[Cron] Failed to fetch scheduled videos:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!scheduledVideos || scheduledVideos.length === 0) {
      console.log('[Cron] No videos to publish')
      return NextResponse.json({ message: 'No videos to publish', processed: 0 })
    }

    console.log(`[Cron] Found ${scheduledVideos.length} videos to publish`)

    const results = []

    for (const video of scheduledVideos) {
      const profile = video.profiles as unknown as { ig_user_id: string; ig_access_token: string }

      if (!profile?.ig_user_id || !profile?.ig_access_token) {
        console.log(`[Cron] Skipping video ${video.id}: No Instagram connection`)
        results.push({ videoId: video.id, status: 'skipped', reason: 'No Instagram connection' })
        continue
      }

      if (!video.video_url) {
        console.log(`[Cron] Skipping video ${video.id}: No video URL`)
        results.push({ videoId: video.id, status: 'skipped', reason: 'No video URL' })
        continue
      }

      console.log(`[Cron] Publishing video ${video.id}: ${video.title}`)

      try {
        const publishResult = await publishToInstagram({
          igUserId: profile.ig_user_id,
          accessToken: profile.ig_access_token,
          videoUrl: video.video_url,
          caption: video.caption || '',
        })

        if (publishResult.success) {
          // 成功時の更新
          await supabaseAdmin
            .from('videos')
            .update({
              ig_media_id: publishResult.mediaId,
              published_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', video.id)

          // 通知を送信
          await notifyVideoPublished(video.user_id, video.id, video.title)

          console.log(`[Cron] Successfully published video ${video.id}`)
          results.push({
            videoId: video.id,
            status: 'success',
            mediaId: publishResult.mediaId,
            permalink: publishResult.permalink,
          })
        } else {
          // 失敗時の更新
          await supabaseAdmin
            .from('videos')
            .update({
              error_message: publishResult.error,
              updated_at: new Date().toISOString(),
            })
            .eq('id', video.id)

          console.error(`[Cron] Failed to publish video ${video.id}: ${publishResult.error}`)
          results.push({
            videoId: video.id,
            status: 'failed',
            error: publishResult.error,
          })
        }
      } catch (error) {
        console.error(`[Cron] Error publishing video ${video.id}:`, error)
        results.push({
          videoId: video.id,
          status: 'error',
          error: String(error),
        })
      }
    }

    return NextResponse.json({
      message: 'Scheduled publish completed',
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error('[Cron] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface PublishParams {
  igUserId: string
  accessToken: string
  videoUrl: string
  caption: string
}

interface PublishResult {
  success: boolean
  mediaId?: string
  permalink?: string
  error?: string
}

async function publishToInstagram(params: PublishParams): Promise<PublishResult> {
  const { igUserId, accessToken, videoUrl, caption } = params

  try {
    // Step 1: メディアコンテナを作成
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: videoUrl,
          caption: caption,
          access_token: accessToken,
        }),
      }
    )

    if (!containerResponse.ok) {
      const error = await containerResponse.json()
      console.error('[Publish] Container creation error:', error)
      return { success: false, error: error?.error?.message || 'Failed to create media container' }
    }

    const containerData = await containerResponse.json()
    const containerId = containerData.id

    // Step 2: メディアの処理状態を確認（最大60秒待機）
    let status = 'IN_PROGRESS'
    let attempts = 0
    const maxAttempts = 30

    while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const statusResponse = await fetch(
        `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${accessToken}`
      )

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        status = statusData.status_code
      }

      attempts++
    }

    if (status !== 'FINISHED') {
      return { success: false, error: `Media processing failed: ${status}` }
    }

    // Step 3: メディアを公開
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    )

    if (!publishResponse.ok) {
      const error = await publishResponse.json()
      console.error('[Publish] Publish error:', error)
      return { success: false, error: error?.error?.message || 'Failed to publish media' }
    }

    const publishData = await publishResponse.json()
    const mediaId = publishData.id

    // Step 4: パーマリンクを取得
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}?fields=permalink&access_token=${accessToken}`
    )

    let permalink = null
    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json()
      permalink = mediaData.permalink
    }

    return { success: true, mediaId, permalink }
  } catch (error) {
    console.error('[Publish] Instagram API error:', error)
    return { success: false, error: 'Instagram API error' }
  }
}
