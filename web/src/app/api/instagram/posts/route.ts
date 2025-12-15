import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// Instagram投稿履歴を取得するAPI
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // 'published', 'failed', 'pending', etc.

    let query = supabase
      .from('instagram_posts')
      .select(`
        id,
        status,
        ig_media_id,
        ig_permalink,
        caption,
        error_code,
        error_message,
        retry_count,
        scheduled_at,
        published_at,
        created_at,
        videos (
          id,
          title,
          thumbnail_url,
          video_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: posts, error } = await query

    if (error) {
      console.error('Failed to fetch instagram posts:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // 合計数を取得
    let countQuery = supabase
      .from('instagram_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count } = await countQuery

    return NextResponse.json({
      posts: posts || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Instagram posts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
