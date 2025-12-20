import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// テンプレート一覧を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // ユーザーのプランを取得
    let userPlan = 'free'
    if (user) {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_id')
        .eq('user_id', user.id)
        .single()

      userPlan = subscription?.plan_id || 'free'
    }

    // テンプレート取得
    const { data: templates, error } = await supabaseAdmin
      .from('video_templates')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })

    if (error) {
      console.error('Templates fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    // プラン権限マッピング
    const planHierarchy: Record<string, number> = {
      free: 0,
      pro: 1,
      business: 2,
    }

    // 各テンプレートに利用可能かどうかのフラグを追加
    const templatesWithAccess = templates.map(template => ({
      ...template,
      isAccessible: planHierarchy[userPlan] >= planHierarchy[template.plan_required],
    }))

    return NextResponse.json({
      templates: templatesWithAccess,
      userPlan,
    })
  } catch (error) {
    console.error('Templates API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
