import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// Admin client for service operations
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Long-lived tokenを更新するAPI呼び出し
async function refreshLongLivedToken(accessToken: string): Promise<{
  success: boolean
  newToken?: string
  expiresIn?: number
  error?: string
}> {
  try {
    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`,
      { method: 'GET' }
    )

    const data = await response.json()

    if (data.error) {
      return {
        success: false,
        error: data.error.message || 'Token refresh failed'
      }
    }

    return {
      success: true,
      newToken: data.access_token,
      expiresIn: data.expires_in
    }
  } catch (error) {
    console.error('Token refresh API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 手動でトークンを更新するAPI
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 現在のトークンを取得
    const { data: credentials, error: fetchError } = await supabase
      .from('instagram_credentials')
      .select('id, access_token, token_expires_at')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !credentials) {
      return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })
    }

    // トークンを更新
    const refreshResult = await refreshLongLivedToken(credentials.access_token)

    if (!refreshResult.success) {
      return NextResponse.json({
        error: refreshResult.error || 'Token refresh failed',
        action_required: 'Please reconnect your Instagram account'
      }, { status: 400 })
    }

    // 新しい有効期限を計算（通常60日）
    const newExpiresAt = new Date(
      Date.now() + (refreshResult.expiresIn || 60 * 24 * 60 * 60) * 1000
    )

    // データベースを更新
    const { error: updateError } = await supabaseAdmin
      .from('instagram_credentials')
      .update({
        access_token: refreshResult.newToken,
        token_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', credentials.id)

    if (updateError) {
      console.error('Failed to update token:', updateError)
      return NextResponse.json({ error: 'Failed to save new token' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      new_expires_at: newExpiresAt.toISOString(),
      message: 'Token refreshed successfully'
    })
  } catch (error) {
    console.error('Refresh token API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
