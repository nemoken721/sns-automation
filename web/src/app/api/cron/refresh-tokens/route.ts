import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyTokenExpiring } from '@/lib/notifications'

// Service roleでSupabaseクライアントを作成
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// トークン更新の設定
const TOKEN_REFRESH_DAYS_BEFORE = 7  // 期限7日前に更新
const TOKEN_WARNING_DAYS = 14        // 期限14日前に警告通知

interface InstagramCredential {
  id: string
  user_id: string
  access_token: string
  token_expires_at: string | null
  ig_user_id: string
  username: string
}

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
      expiresIn: data.expires_in  // 秒単位
    }
  } catch (error) {
    console.error('Token refresh API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function GET(request: NextRequest) {
  // Cron認証チェック
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('Starting token refresh check...')

  try {
    // 全てのInstagram認証情報を取得
    const { data: credentials, error: fetchError } = await supabaseAdmin
      .from('instagram_credentials')
      .select('*')

    if (fetchError) {
      console.error('Failed to fetch credentials:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch credentials' },
        { status: 500 }
      )
    }

    if (!credentials || credentials.length === 0) {
      return NextResponse.json({ message: 'No credentials to check' })
    }

    const results = {
      checked: 0,
      refreshed: 0,
      warned: 0,
      errors: [] as string[]
    }

    const now = new Date()

    for (const cred of credentials as InstagramCredential[]) {
      results.checked++

      // token_expires_atがnullの場合はスキップ（手動トークンの場合）
      if (!cred.token_expires_at) {
        console.log(`User ${cred.user_id}: No expiry date set, attempting refresh anyway`)

        // トークン更新を試行
        const refreshResult = await refreshLongLivedToken(cred.access_token)

        if (refreshResult.success && refreshResult.newToken) {
          const newExpiresAt = new Date(
            Date.now() + (refreshResult.expiresIn || 60 * 24 * 60 * 60) * 1000
          )

          await supabaseAdmin
            .from('instagram_credentials')
            .update({
              access_token: refreshResult.newToken,
              token_expires_at: newExpiresAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', cred.id)

          results.refreshed++
          console.log(`User ${cred.user_id}: Token refreshed, new expiry: ${newExpiresAt}`)
        }
        continue
      }

      const expiresAt = new Date(cred.token_expires_at)
      const daysUntilExpiry = Math.floor(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      console.log(`User ${cred.user_id}: Token expires in ${daysUntilExpiry} days`)

      // 期限切れの場合
      if (daysUntilExpiry <= 0) {
        console.log(`User ${cred.user_id}: Token expired`)
        await notifyTokenExpiring(cred.user_id, 0)
        results.warned++
        continue
      }

      // 警告期間内の場合（14日以内）
      if (daysUntilExpiry <= TOKEN_WARNING_DAYS && daysUntilExpiry > TOKEN_REFRESH_DAYS_BEFORE) {
        console.log(`User ${cred.user_id}: Sending expiry warning`)
        await notifyTokenExpiring(cred.user_id, daysUntilExpiry)
        results.warned++
      }

      // 更新期間内の場合（7日以内）
      if (daysUntilExpiry <= TOKEN_REFRESH_DAYS_BEFORE) {
        console.log(`User ${cred.user_id}: Attempting token refresh`)

        const refreshResult = await refreshLongLivedToken(cred.access_token)

        if (refreshResult.success && refreshResult.newToken) {
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
            .eq('id', cred.id)

          if (updateError) {
            console.error(`User ${cred.user_id}: Failed to update token:`, updateError)
            results.errors.push(`User ${cred.user_id}: DB update failed`)
          } else {
            results.refreshed++
            console.log(`User ${cred.user_id}: Token refreshed successfully, new expiry: ${newExpiresAt}`)
          }
        } else {
          console.error(`User ${cred.user_id}: Token refresh failed:`, refreshResult.error)
          results.errors.push(`User ${cred.user_id}: ${refreshResult.error}`)

          // リフレッシュ失敗時は通知
          await notifyTokenExpiring(cred.user_id, daysUntilExpiry)
          results.warned++
        }
      }
    }

    console.log('Token refresh check completed:', results)

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Token refresh cron error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
