import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notifyVideoPublished, notifyVideoFailed } from '@/lib/notifications'
import {
  parseInstagramError,
  getUserFriendlyMessage
} from '@/lib/instagram-errors'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// Admin client for service operations
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Instagram Reels投稿API
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { videoId, caption } = body

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    // 動画情報を取得
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (video.status !== 'completed' || !video.video_url) {
      return NextResponse.json({ error: 'Video is not ready for publishing' }, { status: 400 })
    }

    // Instagram認証情報を取得（instagram_credentialsテーブルを優先）
    let igCredentials = null

    const { data: credentials } = await supabase
      .from('instagram_credentials')
      .select('ig_user_id, access_token')
      .eq('user_id', user.id)
      .single()

    if (credentials) {
      igCredentials = {
        igUserId: credentials.ig_user_id,
        accessToken: credentials.access_token
      }
    } else {
      // フォールバック: profilesテーブル
      const { data: profile } = await supabase
        .from('profiles')
        .select('ig_user_id, ig_access_token')
        .eq('id', user.id)
        .single()

      if (profile?.ig_user_id && profile?.ig_access_token) {
        igCredentials = {
          igUserId: profile.ig_user_id,
          accessToken: profile.ig_access_token
        }
      }
    }

    if (!igCredentials) {
      return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })
    }

    // instagram_postsレコードを作成
    const { data: igPost, error: igPostError } = await supabaseAdmin
      .from('instagram_posts')
      .insert({
        video_id: videoId,
        user_id: user.id,
        caption: caption || video.caption || '',
        status: 'uploading'
      })
      .select()
      .single()

    if (igPostError) {
      console.error('Failed to create instagram_post:', igPostError)
      // instagram_postsテーブルがなくても処理を継続
    }

    // Instagram Reels投稿を実行
    const result = await publishToInstagram({
      igUserId: igCredentials.igUserId,
      accessToken: igCredentials.accessToken,
      videoUrl: video.video_url,
      caption: caption || video.caption || '',
      igPostId: igPost?.id
    })

    if (!result.success) {
      const parsedError = parseInstagramError(result.originalError || { error: { message: result.error } })
      const userMessage = getUserFriendlyMessage(parsedError.code)

      // instagram_postsを更新
      if (igPost?.id) {
        await supabaseAdmin
          .from('instagram_posts')
          .update({
            status: 'failed',
            error_code: parsedError.code,
            error_message: result.error,
            retry_count: (igPost.retry_count || 0) + 1
          })
          .eq('id', igPost.id)
      }

      // videosテーブルも更新
      await supabase
        .from('videos')
        .update({
          status: 'failed',
          error_message: userMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', videoId)

      // 失敗通知
      await notifyVideoFailed(user.id, videoId, video.title || '動画', userMessage)

      return NextResponse.json({
        error: userMessage,
        errorCode: parsedError.code,
        retryable: parsedError.retryable
      }, { status: 500 })
    }

    // instagram_postsを更新
    if (igPost?.id) {
      await supabaseAdmin
        .from('instagram_posts')
        .update({
          status: 'published',
          ig_container_id: result.containerId,
          ig_media_id: result.mediaId,
          ig_permalink: result.permalink,
          published_at: new Date().toISOString()
        })
        .eq('id', igPost.id)
    }

    // videosテーブルを更新
    await supabase
      .from('videos')
      .update({
        ig_media_id: result.mediaId,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', videoId)

    // 成功通知
    await notifyVideoPublished(user.id, videoId, video.title || '動画')

    return NextResponse.json({
      success: true,
      mediaId: result.mediaId,
      permalink: result.permalink,
    })
  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface PublishParams {
  igUserId: string
  accessToken: string
  videoUrl: string
  caption: string
  igPostId?: string
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
  const { igUserId, accessToken, videoUrl, caption, igPostId } = params

  try {
    // Step 1: メディアコンテナを作成
    console.log('Creating media container...')
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
      console.error('Container creation error:', containerData)
      return {
        success: false,
        error: containerData?.error?.message || 'Failed to create media container',
        originalError: containerData
      }
    }

    const containerId = containerData.id
    console.log('Container created:', containerId)

    // instagram_postsのステータスを更新
    if (igPostId) {
      await supabaseAdmin
        .from('instagram_posts')
        .update({
          status: 'processing',
          ig_container_id: containerId
        })
        .eq('id', igPostId)
    }

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
        console.log(`Processing status (${attempts + 1}/${maxAttempts}): ${status}`)
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
    console.log('Publishing media...')
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
      console.error('Publish error:', publishData)
      return {
        success: false,
        containerId,
        error: publishData?.error?.message || 'Failed to publish media',
        originalError: publishData
      }
    }

    const mediaId = publishData.id
    console.log('Media published:', mediaId)

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
      console.error('Failed to get permalink:', e)
      // パーマリンク取得失敗は無視
    }

    return {
      success: true,
      containerId,
      mediaId,
      permalink
    }
  } catch (error) {
    console.error('Instagram API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Instagram API error',
      originalError: error
    }
  }
}
