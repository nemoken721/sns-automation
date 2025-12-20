import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// クレジットを1つ使用（動画生成時に呼び出し）
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // サブスクリプション取得
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // クレジットチェック
    if (subscription.credits_used >= subscription.credits_limit) {
      return NextResponse.json({
        error: 'No credits remaining',
        creditsUsed: subscription.credits_used,
        creditsLimit: subscription.credits_limit,
      }, { status: 403 })
    }

    // ステータスチェック
    if (subscription.status !== 'active') {
      return NextResponse.json({
        error: 'Subscription not active',
        status: subscription.status,
      }, { status: 403 })
    }

    // クレジットを使用
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        credits_used: subscription.credits_used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    if (error) {
      console.error('Failed to use credit:', error)
      return NextResponse.json({ error: 'Failed to use credit' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      creditsUsed: subscription.credits_used + 1,
      creditsLimit: subscription.credits_limit,
      creditsRemaining: subscription.credits_limit - subscription.credits_used - 1,
    })
  } catch (error) {
    console.error('Use credit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
