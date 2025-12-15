import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// Instagram Insightsを取得するAPI
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const searchParams = request.nextUrl.searchParams
    const mediaId = searchParams.get('mediaId')

    if (mediaId) {
      // 特定のメディアのインサイトを取得
      const insights = await getMediaInsights(mediaId, profile.ig_access_token)
      return NextResponse.json(insights)
    } else {
      // アカウント全体のインサイトを取得
      const insights = await getAccountInsights(profile.ig_user_id, profile.ig_access_token)
      return NextResponse.json(insights)
    }
  } catch (error) {
    console.error('Insights error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getMediaInsights(mediaId: string, accessToken: string) {
  try {
    // Reelsのメトリクス
    const metrics = [
      'plays',
      'reach',
      'saved',
      'likes',
      'comments',
      'shares',
    ].join(',')

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Media insights error:', error)
      return { success: false, error: error?.error?.message || 'Failed to fetch insights' }
    }

    const data = await response.json()

    // メトリクスをオブジェクトに変換
    const insights: Record<string, number> = {}
    for (const item of data.data || []) {
      insights[item.name] = item.values?.[0]?.value || 0
    }

    return { success: true, insights }
  } catch (error) {
    console.error('Media insights fetch error:', error)
    return { success: false, error: 'Failed to fetch media insights' }
  }
}

async function getAccountInsights(igUserId: string, accessToken: string) {
  try {
    // アカウントの基本情報を取得
    const accountResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}?fields=followers_count,follows_count,media_count,username,biography,profile_picture_url&access_token=${accessToken}`
    )

    if (!accountResponse.ok) {
      const error = await accountResponse.json()
      console.error('Account info error:', error)
      return { success: false, error: error?.error?.message || 'Failed to fetch account info' }
    }

    const accountData = await accountResponse.json()

    // 最近のメディア一覧を取得
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=20&access_token=${accessToken}`
    )

    let recentMedia = []
    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json()
      recentMedia = mediaData.data || []
    }

    // アカウントインサイト（過去30日間）
    const insightsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/insights?metric=reach,impressions,profile_views,accounts_engaged&period=day&since=${getDateDaysAgo(30)}&until=${getDateDaysAgo(0)}&access_token=${accessToken}`
    )

    let accountInsights: Record<string, number[]> = {}
    if (insightsResponse.ok) {
      const insightsData = await insightsResponse.json()
      for (const item of insightsData.data || []) {
        accountInsights[item.name] = item.values?.map((v: { value: number }) => v.value) || []
      }
    }

    return {
      success: true,
      account: {
        username: accountData.username,
        biography: accountData.biography,
        profilePictureUrl: accountData.profile_picture_url,
        followersCount: accountData.followers_count,
        followsCount: accountData.follows_count,
        mediaCount: accountData.media_count,
      },
      insights: accountInsights,
      recentMedia,
    }
  } catch (error) {
    console.error('Account insights fetch error:', error)
    return { success: false, error: 'Failed to fetch account insights' }
  }
}

function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return Math.floor(date.getTime() / 1000).toString()
}
