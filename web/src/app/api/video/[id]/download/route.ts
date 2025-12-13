import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { readFile, access } from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // ユーザー認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 動画レコードを取得して所有者チェック
    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !video) {
      return NextResponse.json(
        { error: '動画が見つかりません' },
        { status: 404 }
      )
    }

    if (video.status !== 'completed') {
      return NextResponse.json(
        { error: '動画がまだ完成していません' },
        { status: 400 }
      )
    }

    // ローカルファイルパスを構築
    const projectRoot = process.cwd().replace(/[\\/]web$/, '')
    const outputName = `video_${id}`
    const videoPath = path.join(projectRoot, 'output', outputName, `${outputName}.mp4`)

    // ファイルの存在確認
    try {
      await access(videoPath)
    } catch {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 404 }
      )
    }

    // ファイルを読み込んで返す
    const fileBuffer = await readFile(videoPath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${video.title || outputName}.mp4"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'ダウンロードエラー' },
      { status: 500 }
    )
  }
}
