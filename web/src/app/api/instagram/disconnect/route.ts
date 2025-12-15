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

// Instagram接続を解除するAPI
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // instagram_credentialsテーブルからレコードを削除
    const { error: deleteCredentialsError } = await supabaseAdmin
      .from('instagram_credentials')
      .delete()
      .eq('user_id', user.id)

    if (deleteCredentialsError) {
      console.error('Failed to delete instagram_credentials:', deleteCredentialsError)
    }

    // profilesテーブルのInstagram関連情報をクリア
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        ig_user_id: null,
        ig_access_token: null,
        instagram_connected: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateProfileError) {
      console.error('Failed to update profile:', updateProfileError)
    }

    return NextResponse.json({
      success: true,
      message: 'Instagram account disconnected'
    })
  } catch (error) {
    console.error('Disconnect API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
