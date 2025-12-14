import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Cloud Run API URL
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL || 'https://video-generator-127789508356.asia-northeast1.run.app'

export async function POST(request: NextRequest) {
  try {
    const { theme, userId } = await request.json()

    if (!theme || !userId) {
      return NextResponse.json(
        { error: 'テーマとユーザーIDは必須です' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // ユーザー認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 動画レコードを作成（processing状態）
    const { data: video, error: insertError } = await supabase
      .from('videos')
      .insert({
        user_id: userId,
        title: theme.slice(0, 50),
        theme: theme,
        status: 'processing',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'データベースエラー' },
        { status: 500 }
      )
    }

    console.log(`Starting video generation via Cloud Run: ${video.id}`)

    // Cloud Run APIを呼び出し（レスポンスを待たない - Fire and Forget）
    // Cloud Runが完了時に直接Supabaseを更新する
    fetch(`${CLOUD_RUN_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme: theme,
        video_id: video.id,
        user_id: userId,
      }),
    }).catch(error => {
      // エラーをログに記録するが、すでにレスポンスは返しているので何もできない
      console.error('Cloud Run API error (fire-and-forget):', error)
    })

    // すぐにレスポンスを返す（Vercelのタイムアウトを回避）
    return NextResponse.json({
      success: true,
      videoId: video.id,
      message: '動画生成を開始しました。完了までお待ちください。',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
