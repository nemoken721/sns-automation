import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// Vercel Cron認証用
const CRON_SECRET = process.env.CRON_SECRET

// Supabaseサービスロールクライアント
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// アナリティクスを定期的に収集するCron API
export async function GET(request: NextRequest) {
  try {
    // Cron認証
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Analytics Cron] Starting analytics collection')

    // 投稿済みの動画を取得
    const { data: publishedVideos, error: fetchError } = await supabaseAdmin
      .from('videos')
      .select(`
        id,
        ig_media_id,
        user_id,
        profiles!inner (
          ig_access_token
        )
      `)
      .not('ig_media_id', 'is', null)
      .not('published_at', 'is', null)
      .limit(50)

    if (fetchError) {
      console.error('[Analytics Cron] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!publishedVideos || publishedVideos.length === 0) {
      console.log('[Analytics Cron] No published videos found')
      return NextResponse.json({ message: 'No published videos', collected: 0 })
    }

    console.log(`[Analytics Cron] Found ${publishedVideos.length} published videos`)

    const results = []

    for (const video of publishedVideos) {
      const profile = video.profiles as unknown as { ig_access_token: string }

      if (!profile?.ig_access_token || !video.ig_media_id) {
        continue
      }

      try {
        const insights = await getMediaInsights(video.ig_media_id, profile.ig_access_token)

        if (insights.success && insights.data) {
          // video_analyticsテーブルに保存
          const { error: insertError } = await supabaseAdmin
            .from('video_analytics')
            .upsert({
              video_id: video.id,
              ig_media_id: video.ig_media_id,
              plays: insights.data.plays || 0,
              reach: insights.data.reach || 0,
              likes: insights.data.likes || 0,
              comments: insights.data.comments || 0,
              shares: insights.data.shares || 0,
              saved: insights.data.saved || 0,
              collected_at: new Date().toISOString(),
            }, {
              onConflict: 'video_id,collected_at',
            })

          if (insertError) {
            console.error(`[Analytics Cron] Insert error for video ${video.id}:`, insertError)
            results.push({ videoId: video.id, status: 'error', error: insertError.message })
          } else {
            results.push({ videoId: video.id, status: 'success', insights: insights.data })
          }
        } else {
          results.push({ videoId: video.id, status: 'failed', error: insights.error })
        }
      } catch (error) {
        console.error(`[Analytics Cron] Error for video ${video.id}:`, error)
        results.push({ videoId: video.id, status: 'error', error: String(error) })
      }
    }

    return NextResponse.json({
      message: 'Analytics collection completed',
      collected: results.filter(r => r.status === 'success').length,
      results,
    })
  } catch (error) {
    console.error('[Analytics Cron] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface InsightsResult {
  success: boolean
  data?: {
    plays: number
    reach: number
    likes: number
    comments: number
    shares: number
    saved: number
  }
  error?: string
}

async function getMediaInsights(mediaId: string, accessToken: string): Promise<InsightsResult> {
  try {
    // 基本的なメトリクス
    const metrics = ['plays', 'reach', 'saved', 'likes', 'comments', 'shares'].join(',')

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`
    )

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error?.error?.message || 'API error' }
    }

    const data = await response.json()

    const insights: Record<string, number> = {
      plays: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saved: 0,
    }

    for (const item of data.data || []) {
      if (insights.hasOwnProperty(item.name)) {
        insights[item.name] = item.values?.[0]?.value || 0
      }
    }

    return { success: true, data: insights as InsightsResult['data'] }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
