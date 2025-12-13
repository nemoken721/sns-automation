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

    // 動画レコードを作成（pending状態）
    const { data: video, error: insertError } = await supabase
      .from('videos')
      .insert({
        user_id: userId,
        title: theme.slice(0, 50),
        theme: theme,
        status: 'pending',
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

    // バックグラウンドで動画生成を開始（Cloud Run経由）
    generateVideoInBackground(video.id, theme, userId, supabase)

    return NextResponse.json({
      success: true,
      videoId: video.id,
      message: '動画生成を開始しました',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}

// Cloud Runで動画生成
async function generateVideoInBackground(
  videoId: string,
  theme: string,
  userId: string,
  supabase: any
) {
  try {
    // ステータスを processing に更新
    await supabase
      .from('videos')
      .update({ status: 'processing' })
      .eq('id', videoId)

    console.log(`Starting video generation via Cloud Run: ${videoId}`)

    // Cloud Run APIを呼び出し
    const response = await fetch(`${CLOUD_RUN_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme: theme,
        video_id: videoId,
        user_id: userId,
      }),
    })

    const result = await response.json()

    if (response.ok && result.success) {
      // 成功時 - Cloud Storageの公開URLを保存
      await supabase
        .from('videos')
        .update({
          status: 'completed',
          video_url: result.video_url,
          thumbnail_url: result.thumbnail_url,
          caption: result.caption,
          title: result.title || theme.slice(0, 50),
        })
        .eq('id', videoId)

      console.log(`Video generation completed: ${videoId}`)
      console.log(`Video URL: ${result.video_url}`)
    } else {
      // 失敗時
      const errorMessage = result.error || '動画生成に失敗しました'
      await supabase
        .from('videos')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', videoId)

      console.error(`Video generation failed: ${videoId}`, errorMessage)
    }
  } catch (error) {
    console.error('Cloud Run API error:', error)
    await supabase
      .from('videos')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Cloud Run API エラー',
      })
      .eq('id', videoId)
  }
}
