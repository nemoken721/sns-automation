import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

const META_APP_ID = process.env.META_APP_ID
const META_APP_SECRET = process.env.META_APP_SECRET
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/instagram/callback'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state') // ユーザーID
    const error = searchParams.get('error')

    if (error) {
      console.error('Instagram OAuth error:', error)
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_denied', request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=invalid_callback', request.url)
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== state) {
      return NextResponse.redirect(
        new URL('/login', request.url)
      )
    }

    // 1. 短期アクセストークンを取得
    const tokenResponse = await fetch(
      'https://graph.facebook.com/v18.0/oauth/access_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: META_APP_ID!,
          client_secret: META_APP_SECRET!,
          redirect_uri: REDIRECT_URI,
          code: code,
        }),
      }
    )

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token exchange error:', errorData)
      const errorMessage = errorData?.error?.message || 'unknown'
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=token_exchange_failed&detail=${encodeURIComponent(errorMessage)}`, request.url)
      )
    }

    const tokenData = await tokenResponse.json()
    const shortLivedToken = tokenData.access_token

    // 2. 長期アクセストークンに交換
    const longTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: META_APP_ID!,
        client_secret: META_APP_SECRET!,
        fb_exchange_token: shortLivedToken,
      })
    )

    if (!longTokenResponse.ok) {
      const errorData = await longTokenResponse.json()
      console.error('Long token exchange error:', errorData)
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=long_token_failed', request.url)
      )
    }

    const longTokenData = await longTokenResponse.json()
    const longLivedToken = longTokenData.access_token
    const expiresIn = longTokenData.expires_in || 5184000 // デフォルト60日

    // 3. Facebookページを取得
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedToken}`
    )

    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json()
      console.error('Failed to get pages:', errorData)
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=pages_failed&detail=${encodeURIComponent(JSON.stringify(errorData))}`, request.url)
      )
    }

    const pagesData = await pagesResponse.json()
    console.log('Pages response:', JSON.stringify(pagesData))
    const pages = pagesData.data || []

    if (pages.length === 0) {
      // デバッグ: ユーザー情報を取得してみる
      const meResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${longLivedToken}`
      )
      const meData = await meResponse.json()
      console.error('No pages found. User info:', meData)
      console.error('Full pages response:', JSON.stringify(pagesData))
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=no_pages&debug=${encodeURIComponent(JSON.stringify({ user: meData, pages: pagesData }))}`, request.url)
      )
    }

    // 4. 最初のページに紐づくInstagramビジネスアカウントを取得
    const pageId = pages[0].id
    const pageAccessToken = pages[0].access_token

    const igAccountResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
    )

    if (!igAccountResponse.ok) {
      console.error('Failed to get Instagram account')
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=ig_account_failed', request.url)
      )
    }

    const igAccountData = await igAccountResponse.json()
    const igBusinessAccount = igAccountData.instagram_business_account

    if (!igBusinessAccount) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=no_ig_business', request.url)
      )
    }

    const igUserId = igBusinessAccount.id

    // 5. Instagramユーザー名を取得
    const igUserResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}?fields=username,name,profile_picture_url&access_token=${pageAccessToken}`
    )

    let igUsername = null
    let igProfilePicture = null
    if (igUserResponse.ok) {
      const igUserData = await igUserResponse.json()
      igUsername = igUserData.username
      igProfilePicture = igUserData.profile_picture_url
    }

    // 6. Supabaseにトークンを保存
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ig_user_id: igUserId,
        ig_username: igUsername,
        ig_access_token: pageAccessToken, // ページアクセストークンを使用
        ig_token_expires_at: expiresAt,
        ig_profile_picture: igProfilePicture,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to save Instagram token:', updateError)
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=save_failed', request.url)
      )
    }

    // 成功
    return NextResponse.redirect(
      new URL('/dashboard/settings?success=instagram_connected', request.url)
    )
  } catch (error) {
    console.error('Instagram callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=unknown', request.url)
    )
  }
}
