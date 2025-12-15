import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// Graph API Explorerから取得したトークンを手動で保存
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { ig_user_id, ig_username, ig_access_token } = body

    if (!ig_user_id || !ig_access_token) {
      return NextResponse.json(
        { error: 'Missing required fields: ig_user_id, ig_access_token' },
        { status: 400 }
      )
    }

    // Graph API Explorerのトークンは約60日間有効
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ig_user_id: ig_user_id,
        ig_username: ig_username || null,
        ig_access_token: ig_access_token,
        ig_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to save Instagram token:', updateError)
      return NextResponse.json(
        { error: 'Failed to save data', detail: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Instagram account connected successfully',
      data: {
        ig_user_id,
        ig_username,
        expires_at: expiresAt,
      }
    })
  } catch (error) {
    console.error('Manual Instagram save error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
