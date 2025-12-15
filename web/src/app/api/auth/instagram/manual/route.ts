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

    // トークンを検証（Instagram APIを呼び出してみる）
    const verifyResponse = await fetch(
      `https://graph.instagram.com/v18.0/${ig_user_id}?fields=id,username&access_token=${ig_access_token}`
    )

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json()
      console.error('Token verification failed:', errorData)
      return NextResponse.json(
        { error: 'Invalid token or account ID', detail: errorData?.error?.message },
        { status: 400 }
      )
    }

    const verifyData = await verifyResponse.json()
    const verifiedUsername = verifyData.username || ig_username

    // Graph API Explorerのトークンは約60日間有効
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

    // 1. profilesテーブルを更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ig_user_id: ig_user_id,
        ig_username: verifiedUsername,
        ig_access_token: ig_access_token,
        ig_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to save to profiles:', updateError)
      return NextResponse.json(
        { error: 'Failed to save data', detail: updateError.message },
        { status: 500 }
      )
    }

    // 2. instagram_credentialsテーブルにも保存（upsert）
    const { error: credentialsError } = await supabaseAdmin
      .from('instagram_credentials')
      .upsert({
        user_id: user.id,
        ig_user_id: ig_user_id,
        username: verifiedUsername,
        access_token: ig_access_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (credentialsError) {
      console.error('Failed to save to instagram_credentials:', credentialsError)
      // profilesには保存できたので続行
    }

    return NextResponse.json({
      success: true,
      message: 'Instagram account connected successfully',
      data: {
        ig_user_id,
        ig_username: verifiedUsername,
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
