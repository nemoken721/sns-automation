import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// Instagram Reels投稿API
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { videoId } = body

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

    // プロフィールからInstagram認証情報を取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('ig_user_id, ig_access_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.ig_user_id || !profile?.ig_access_token) {
      return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })
    }

    // Instagram Reels投稿を実行
    const result = await publishToInstagram({
      igUserId: profile.ig_user_id,
      accessToken: profile.ig_access_token,
      videoUrl: video.video_url,
      caption: video.caption || '',
    })

    if (!result.success) {
      // エラーを記録
      await supabase
        .from('videos')
        .update({
          status: 'failed',
          error_message: result.error,
          updated_at: new Date().toISOString(),
        })
        .eq('id', videoId)

      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // 成功時の更新
    await supabase
      .from('videos')
      .update({
        ig_media_id: result.mediaId,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', videoId)

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
      console.error('Container creation error:', error)
      return { success: false, error: error?.error?.message || 'Failed to create media container' }
    }

    const containerData = await containerResponse.json()
    const containerId = containerData.id

    // Step 2: メディアの処理状態を確認（最大60秒待機）
    let status = 'IN_PROGRESS'
    let attempts = 0
    const maxAttempts = 30 // 2秒間隔で30回 = 60秒

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
      console.error('Publish error:', error)
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
    console.error('Instagram API error:', error)
    return { success: false, error: 'Instagram API error' }
  }
}
