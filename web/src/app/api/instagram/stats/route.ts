import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// 投稿統計を取得するAPI
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 各ステータスの投稿数を取得
    const { data: posts, error } = await supabase
      .from('instagram_posts')
      .select('status')
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to fetch posts:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // 統計を計算
    const stats = {
      total_posts: posts?.length || 0,
      successful_posts: 0,
      failed_posts: 0,
      scheduled_posts: 0,
      processing_posts: 0,
      success_rate: 0
    }

    if (posts) {
      for (const post of posts) {
        switch (post.status) {
          case 'published':
            stats.successful_posts++
            break
          case 'failed':
            stats.failed_posts++
            break
          case 'pending':
            stats.scheduled_posts++
            break
          case 'uploading':
          case 'processing':
            stats.processing_posts++
            break
        }
      }

      // 成功率を計算（処理中と予定を除く）
      const completedPosts = stats.successful_posts + stats.failed_posts
      if (completedPosts > 0) {
        stats.success_rate = Math.round((stats.successful_posts / completedPosts) * 1000) / 10
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
