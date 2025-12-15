import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// 特定の投稿のステータスを取得（ポーリング用）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: post, error } = await supabase
      .from('instagram_posts')
      .select(`
        id,
        status,
        ig_media_id,
        ig_permalink,
        error_code,
        error_message,
        retry_count,
        published_at,
        updated_at
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({
      post_id: post.id,
      status: post.status,
      instagram_post_id: post.ig_media_id,
      permalink: post.ig_permalink,
      error_code: post.error_code,
      error_message: post.error_message,
      retry_count: post.retry_count,
      published_at: post.published_at,
      updated_at: post.updated_at
    })
  } catch (error) {
    console.error('Post status API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
