import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// コンテンツアイデア一覧を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const month = searchParams.get('month') // YYYY-MM形式
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('content_ideas')
      .select(`
        *,
        videos (
          id,
          title,
          status,
          video_url,
          thumbnail_url
        )
      `)
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    if (month) {
      const startDate = `${month}-01`
      const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
        .toISOString().split('T')[0]
      query = query.gte('scheduled_date', startDate).lte('scheduled_date', endDate)
    }

    const { data: ideas, error } = await query

    if (error) {
      console.error('Failed to fetch content ideas:', error)
      return NextResponse.json(
        { error: 'Failed to fetch ideas' },
        { status: 500 }
      )
    }

    // 統計情報も返す
    const { count: totalCount } = await supabase
      .from('content_ideas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { count: draftCount } = await supabase
      .from('content_ideas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'draft')

    const { count: scheduledCount } = await supabase
      .from('content_ideas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'scheduled')

    const { count: publishedCount } = await supabase
      .from('content_ideas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'published')

    return NextResponse.json({
      ideas: ideas || [],
      stats: {
        total: totalCount || 0,
        draft: draftCount || 0,
        scheduled: scheduledCount || 0,
        published: publishedCount || 0,
      }
    })
  } catch (error) {
    console.error('Content ideas API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// コンテンツアイデアを更新
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('content_ideas')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update content idea:', error)
      return NextResponse.json(
        { error: 'Failed to update' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, idea: data })
  } catch (error) {
    console.error('Update content idea error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// コンテンツアイデアを削除
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('content_ideas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete content idea:', error)
      return NextResponse.json(
        { error: 'Failed to delete' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete content idea error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
