import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyVideoPublished, notifyVideoFailed } from '@/lib/notifications'
import {
  parseInstagramError,
  getUserFriendlyMessage,
  shouldRetry,
  getRetryDelay,
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

// 失敗した投稿をリトライするCron
export async function GET(request: NextRequest) {
  try {
    // Cron認証
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    console.log(`[Retry Cron] Running at ${now.toISOString()}`)

    // リトライ可能な失敗投稿を取得
    // - status = 'pending' かつ retry_count > 0（過去に失敗したもの）
    // - または status = 'failed' かつ リトライ可能なエラーコード
    const { data: failedPosts, error: fetchError } = await supabaseAdmin
      .from('instagram_posts')
      .select(`
        id,
        video_id,
        user_id,
        caption,
        status,
        error_code,
        retry_count,
        max_retries,
        updated_at
      `)
      .or('status.eq.pending,status.eq.failed')
      .gt('retry_count', 0)
      .lt('retry_count', 3)  // 最大3回までリトライ
      .limit(5)

    if (fetchError) {
      console.error('[Retry Cron] Failed to fetch failed posts:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!failedPosts || failedPosts.length === 0) {
      console.log('[Retry Cron] No posts to retry')
      return NextResponse.json({ message: 'No posts to retry', processed: 0 })
    }

    console.log(`[Retry Cron] Found ${failedPosts.length} posts to retry`)

    const results = []

    for (const post of failedPosts) {
      // リトライ間隔をチェック（指数バックオフ）
      const lastUpdated = new Date(post.updated_at)
      const retryDelay = getRetryDelay(
        post.error_code as InstagramErrorCode || InstagramErrorCode.TEMPORARY_ERROR,
        post.retry_count
      )
      const nextRetryTime = new Date(lastUpdated.getTime() + retryDelay * 1000)

      if (now < nextRetryTime) {
        console.log(`[Retry Cron] Post ${post.id}: Waiting until ${nextRetryTime.toISOString()}`)
        results.push({ postId: post.id, status: 'waiting', nextRetry: nextRetryTime })
        continue
      }

      // 動画情報を取得
      const { data: video } = await supabaseAdmin
        .from('videos')
        .select('id, title, video_url, caption')
        .eq('id', post.video_id)
        .single()

      if (!video || !video.video_url) {
        console.log(`[Retry Cron] Post ${post.id}: Video not found`)
        results.push({ postId: post.id, status: 'skipped', reason: 'Video not found' })
        continue
      }

      // Instagram認証情報を取得
      const { data: credentials } = await supabaseAdmin
        .from('instagram_credentials')
        .select('ig_user_id, access_token')
        .eq('user_id', post.user_id)
        .single()

      if (!credentials) {
        console.log(`[Retry Cron] Post ${post.id}: No Instagram credentials`)
        results.push({ postId: post.id, status: 'skipped', reason: 'No credentials' })
        continue
      }

      console.log(`[Retry Cron] Retrying post ${post.id}`)

      // ステータスを更新
      await supabaseAdmin
        .from('instagram_posts')
        .update({ status: 'uploading' })
        .eq('id', post.id)

      try {
        const publishResult = await publishToInstagram({
          igUserId: credentials.ig_user_id,
          accessToken: credentials.access_token,
          videoUrl: video.video_url,
          caption: post.caption || video.caption || ''
        })

        if (publishResult.success) {
          // 成功
          await supabaseAdmin
            .from('instagram_posts')
            .update({
              status: 'published',
              ig_container_id: publishResult.containerId,
              ig_media_id: publishResult.mediaId,
              ig_permalink: publishResult.permalink,
              published_at: new Date().toISOString(),
              error_code: null,
              error_message: null
            })
            .eq('id', post.id)

          // videosテーブルも更新
          await supabaseAdmin
            .from('videos')
            .update({
              ig_media_id: publishResult.mediaId,
              published_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', video.id)

          await notifyVideoPublished(post.user_id, video.id, video.title)
          console.log(`[Retry Cron] Post ${post.id} succeeded on retry`)
          results.push({ postId: post.id, status: 'success', mediaId: publishResult.mediaId })
        } else {
          // 失敗
          const parsedError = parseInstagramError(publishResult.originalError || { error: { message: publishResult.error } })
          const newRetryCount = post.retry_count + 1
          const canRetry = shouldRetry(parsedError, newRetryCount, post.max_retries || 3)

          await supabaseAdmin
            .from('instagram_posts')
            .update({
              status: canRetry ? 'pending' : 'failed',
              error_code: parsedError.code,
              error_message: publishResult.error,
              retry_count: newRetryCount
            })
            .eq('id', post.id)

          if (!canRetry) {
            await notifyVideoFailed(post.user_id, video.id, video.title, getUserFriendlyMessage(parsedError.code))
          }

          console.log(`[Retry Cron] Post ${post.id} failed again (retry ${newRetryCount})`)
          results.push({
            postId: post.id,
            status: 'failed',
            error: publishResult.error,
            retryCount: newRetryCount,
            willRetry: canRetry
          })
        }
      } catch (error) {
        console.error(`[Retry Cron] Post ${post.id} error:`, error)
        await supabaseAdmin
          .from('instagram_posts')
          .update({
            status: 'failed',
            error_code: InstagramErrorCode.UNKNOWN_ERROR,
            error_message: String(error),
            retry_count: post.retry_count + 1
          })
          .eq('id', post.id)

        results.push({ postId: post.id, status: 'error', error: String(error) })
      }
    }

    return NextResponse.json({
      message: 'Retry completed',
      processed: results.length,
      results
    })
  } catch (error) {
    console.error('[Retry Cron] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Instagram投稿関数
async function publishToInstagram(params: {
  igUserId: string
  accessToken: string
  videoUrl: string
  caption: string
}): Promise<{
  success: boolean
  containerId?: string
  mediaId?: string
  permalink?: string
  error?: string
  originalError?: unknown
}> {
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
          access_token: accessToken
        })
      }
    )

    const containerData = await containerResponse.json()

    if (!containerResponse.ok || containerData.error) {
      return {
        success: false,
        error: containerData?.error?.message || 'Failed to create media container',
        originalError: containerData
      }
    }

    const containerId = containerData.id

    // Step 2: 処理完了を待機
    let status = 'IN_PROGRESS'
    let attempts = 0
    const maxAttempts = 45

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
      return {
        success: false,
        containerId,
        error: `Media processing failed: ${status}`,
        originalError: { error: { message: `Processing status: ${status}` } }
      }
    }

    // Step 3: メディアを公開
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken
        })
      }
    )

    const publishData = await publishResponse.json()

    if (!publishResponse.ok || publishData.error) {
      return {
        success: false,
        containerId,
        error: publishData?.error?.message || 'Failed to publish media',
        originalError: publishData
      }
    }

    const mediaId = publishData.id

    // Step 4: パーマリンク取得
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
      // ignore
    }

    return { success: true, containerId, mediaId, permalink }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Instagram API error',
      originalError: error
    }
  }
}
