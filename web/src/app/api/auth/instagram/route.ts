import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Meta App credentials (環境変数から取得)
const META_APP_ID = process.env.META_APP_ID
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/instagram/callback'

// Instagram OAuth認証開始
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (!META_APP_ID) {
      return NextResponse.json(
        { error: 'META_APP_ID is not configured' },
        { status: 500 }
      )
    }

    // Instagram OAuth URL
    const scope = [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ].join(',')

    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    authUrl.searchParams.set('client_id', META_APP_ID)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', user.id) // ユーザーIDをstateに含める

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('Instagram auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
