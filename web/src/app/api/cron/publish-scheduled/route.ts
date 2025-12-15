import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyVideoPublished, notifyVideoFailed } from '@/lib/notifications'
import {
  parseInstagramError,
  getUserFriendlyMessage,
  shouldRetry,
  InstagramErrorCode
} from '@/lib/instagram-errors'

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
    // instagram_credentialsテーブルを使用
    const { data: scheduledVideos, error: fetchError } = await supabaseAdmin
      .from('videos')
      .select(`
        id,
        title,
        video_url,
        caption,
        scheduled_at,
        user_id
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
      // Instagram認証情報を取得
      const { data: credentials } = await supabaseAdmin
        .from('instagram_credentials')
        .select('ig_user_id, access_token')
        .eq('user_id', video.user_id)
        .single()

      let igCredentials = null
      if (credentials) {
        igCredentials = {
          igUserId: credentials.ig_user_id,
          accessToken: credentials.access_token
        }
      } else {
        // フォールバック: profilesテーブル
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('ig_user_id, ig_access_token')
          .eq('id', video.user_id)
          .single()

        if (profile?.ig_user_id && profile?.ig_access_token) {
          igCredentials = {
            igUserId: profile.ig_user_id,
            accessToken: profile.ig_access_token
          }
        }
      }

      if (!igCredentials) {
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

      // instagram_postsレコードを作成
      const { data: igPost } = await supabaseAdmin
        .from('instagram_posts')
        .insert({
          video_id: video.id,
          user_id: video.user_id,
          caption: video.caption || '',
          status: 'uploading',
          scheduled_at: video.scheduled_at
        })
        .select()
        .single()

      try {
        const publishResult = await publishToInstagram({
          igUserId: igCredentials.igUserId,
          accessToken: igCredentials.accessToken,
          videoUrl: video.video_url,
          caption: video.caption || '',
        })

        if (publishResult.success) {
          // instagram_postsを更新
          if (igPost?.id) {
            await supabaseAdmin
              .from('instagram_posts')
              .update({
                status: 'published',
                ig_container_id: publishResult.containerId,
                ig_media_id: publishResult.mediaId,
                ig_permalink: publishResult.permalink,
                published_at: new Date().toISOString()
              })
              .eq('id', igPost.id)
          }

          // videosテーブルを更新
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
          // エラー解析
          const parsedError = parseInstagramError(publishResult.originalError || { error: { message: publishResult.error } })
          const userMessage = getUserFriendlyMessage(parsedError.code)

          // instagram_postsを更新
          if (igPost?.id) {
            const retryCount = (igPost.retry_count || 0) + 1
            const canRetry = shouldRetry(parsedError, retryCount, igPost.max_retries || 3)

            await supabaseAdmin
              .from('instagram_posts')
              .update({
                status: canRetry ? 'pending' : 'failed',
                error_code: parsedError.code,
                error_message: publishResult.error,
                retry_count: retryCount
              })
              .eq('id', igPost.id)
          }

          // videosテーブルを更新
          await supabaseAdmin
            .from('videos')
            .update({
              error_message: userMessage,
              updated_at: new Date().toISOString(),
            })
            .eq('id', video.id)

          // 失敗通知
          await notifyVideoFailed(video.user_id, video.id, video.title, userMessage)

          console.error(`[Cron] Failed to publish video ${video.id}: ${publishResult.error}`)
          results.push({
            videoId: video.id,
            status: 'failed',
            error: publishResult.error,
            errorCode: parsedError.code,
            retryable: parsedError.retryable
          })
        }
      } catch (error) {
        console.error(`[Cron] Error publishing video ${video.id}:`, error)

        // instagram_postsを更新
        if (igPost?.id) {
          await supabaseAdmin
            .from('instagram_posts')
            .update({
              status: 'failed',
              error_code: InstagramErrorCode.UNKNOWN_ERROR,
              error_message: String(error),
              retry_count: (igPost.retry_count || 0) + 1
            })
            .eq('id', igPost.id)
        }

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
  containerId?: string
  mediaId?: string
  permalink?: string
  error?: string
  originalError?: unknown
}

async function publishToInstagram(params: PublishParams): Promise<PublishResult> {
  const { igUserId, accessToken, videoUrl, caption } = params

  try {
    // Step 1: メディアコンテナを作成
    console.log('[Publish] Creating media container...')
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

    const containerData = await containerResponse.json()

    if (!containerResponse.ok || containerData.error) {
      console.error('[Publish] Container creation error:', containerData)
      return {
        success: false,
        error: containerData?.error?.message || 'Failed to create media container',
        originalError: containerData
      }
    }

    const containerId = containerData.id
    console.log('[Publish] Container created:', containerId)

    // Step 2: メディアの処理状態を確認（最大90秒待機）
    let status = 'IN_PROGRESS'
    let attempts = 0
    const maxAttempts = 45 // 2秒間隔で45回 = 90秒

    while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const statusResponse = await fetch(
        `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${accessToken}`
      )

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        status = statusData.status_code
        console.log(`[Publish] Processing status (${attempts + 1}/${maxAttempts}): ${status}`)
      }

      attempts++
    }

    if (status !== 'FINISHED') {
      return {
        success: false,
        containerId,
        error: `Media processing failed: ${status}`,
        originalError: { error: { message: `Processing status: ${status}` } }
      }
    }

    // Step 3: メディアを公開
    console.log('[Publish] Publishing media...')
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

    const publishData = await publishResponse.json()

    if (!publishResponse.ok || publishData.error) {
      console.error('[Publish] Publish error:', publishData)
      return {
        success: false,
        containerId,
        error: publishData?.error?.message || 'Failed to publish media',
        originalError: publishData
      }
    }

    const mediaId = publishData.id
    console.log('[Publish] Media published:', mediaId)

    // Step 4: パーマリンクを取得
    let permalink = null
    try {
      const mediaResponse = await fetch(
        `https://graph.facebook.com/v18.0/${mediaId}?fields=permalink&access_token=${accessToken}`
      )

      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json()
        permalink = mediaData.permalink
      }
    } catch (e) {
      console.error('[Publish] Failed to get permalink:', e)
    }

    return {
      success: true,
      containerId,
      mediaId,
      permalink
    }
  } catch (error) {
    console.error('[Publish] Instagram API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Instagram API error',
      originalError: error
    }
  }
}
