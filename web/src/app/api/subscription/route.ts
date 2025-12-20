import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { PLANS } from '@/lib/stripe/config'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// サブスクリプション情報を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      // サブスクリプションがない場合は無料プランを返す
      return NextResponse.json({
        subscription: null,
        plan: PLANS.FREE,
        canCreateVideo: true,
        creditsRemaining: PLANS.FREE.limits.videosPerMonth,
      })
    }

    const plan = PLANS[subscription.plan_id.toUpperCase() as keyof typeof PLANS] || PLANS.FREE
    const creditsRemaining = subscription.credits_limit - subscription.credits_used
    const canCreateVideo = creditsRemaining > 0 && subscription.status === 'active'

    return NextResponse.json({
      subscription,
      plan,
      canCreateVideo,
      creditsRemaining,
    })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}
