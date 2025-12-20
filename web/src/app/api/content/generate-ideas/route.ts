import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// OpenAIクライアントを遅延初期化
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  })
}

interface GenerateIdeasRequest {
  count: number                    // 生成するアイデアの数
  categories?: string[]            // カテゴリ
  targetAudience?: string          // ターゲット層
  startDate?: string               // 開始日
  brandVoice?: string              // ブランドボイス
  includeAnalytics?: boolean       // 過去のアナリティクスを考慮するか
}

// コンテンツアイデアを一括生成（OpenAI GPT-4使用）
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateIdeasRequest = await request.json()
    const {
      count = 7,
      categories = ['ビジネス', 'マーケティング', '自己啓発'],
      targetAudience = '20-40代のビジネスパーソン',
      startDate,
      brandVoice = 'プロフェッショナルで親しみやすい',
      includeAnalytics = true
    } = body

    if (count > 31) {
      return NextResponse.json(
        { error: '一度に生成できるのは最大31件です' },
        { status: 400 }
      )
    }

    console.log(`[Content Generate] Generating ${count} ideas for user ${user.id}`)

    // 過去の投稿パフォーマンスを取得
    let analyticsContext = ''
    if (includeAnalytics) {
      const { data: topVideos } = await supabase
        .from('videos')
        .select('title, theme, ig_likes, ig_comments, ig_shares, ig_saves, ig_plays')
        .eq('user_id', user.id)
        .not('published_at', 'is', null)
        .order('ig_likes', { ascending: false })
        .limit(10)

      if (topVideos && topVideos.length > 0) {
        analyticsContext = `
## 過去の投稿パフォーマンス（参考）
以下は過去に高いエンゲージメントを得た投稿です。このトレンドを参考にしてください：
${topVideos.map((v, i) => `${i + 1}. 「${v.title}」- いいね: ${v.ig_likes || 0}, コメント: ${v.ig_comments || 0}`).join('\n')}
`
      }
    }

    const currentDate = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const prompt = `あなたはSNSマーケティングとコンテンツ戦略の専門家です。
今日は${currentDate}です。

Instagram Reels用のショート動画コンテンツのアイデアを${count}件生成してください。

## 重要な指針
1. **今、話題になっていること**を意識してください
   - 最新のビジネストレンド
   - 季節やイベント（${currentDate}に関連するもの）
   - 経済・テクノロジーの最新動向

2. **視聴者の「痛み」に刺さるコンテンツ**を作成
   - 「あるある」と共感できる内容
   - すぐに使える実践的なTips
   - 意外性のある切り口

3. **バズりやすい要素**を含める
   - 冒頭3秒で「え？」と思わせるフック
   - 数字を使った具体性
   - 感情を揺さぶるストーリー
${analyticsContext}

## 条件
- ターゲット層: ${targetAudience}
- カテゴリ: ${categories.join(', ')}
- トーン: ${brandVoice}
- 動画の長さ: 30-60秒を想定

## 各アイデアに含める内容
1. title: キャッチーなタイトル（15文字以内、数字や感情ワードを使う）
2. hook: 冒頭3秒で視聴者を引きつけるフック文（「え？」「まさか」「知らないと損」系）
3. main_points: メインで伝える内容（3つ、具体的に）
4. call_to_action: 動画の最後のCTA（フォロー誘導など）
5. hashtags: 関連ハッシュタグ（5つ、トレンドタグも含む）
6. category: カテゴリ
7. trend_reason: なぜ今このネタが効果的か（1文）

## 出力形式
必ずJSON形式で出力してください。他のテキストは含めないでください。
{
  "ideas": [
    {
      "title": "売上2倍の秘訣",
      "hook": "この方法を知らないと損してます",
      "main_points": ["ポイント1", "ポイント2", "ポイント3"],
      "call_to_action": "フォローして毎日ビジネスTipsをゲット！",
      "hashtags": ["#ビジネス", "#売上アップ", "#マーケティング", "#起業", "#2024トレンド"],
      "category": "ビジネス",
      "trend_reason": "年末の予算策定時期に売上向上の関心が高まるため"
    }
  ]
}

${count}件のユニークで今すぐバズりそうなアイデアを生成してください。`

    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたはSNSマーケティングの専門家です。必ず有効なJSON形式で回答してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0]?.message?.content

    if (!responseText) {
      throw new Error('AI response is empty')
    }

    let ideas: Array<{
      title: string
      hook: string
      main_points: string[]
      call_to_action: string
      hashtags: string[]
      category: string
      trend_reason?: string
    }>

    try {
      const parsed = JSON.parse(responseText)
      ideas = parsed.ideas || parsed
    } catch (e) {
      console.error('Failed to parse AI response:', responseText)
      throw new Error('AI response parsing failed')
    }

    // 開始日を計算
    const baseDate = startDate ? new Date(startDate) : new Date()

    // データベースに保存
    const contentIdeas = ideas.map((idea, index) => {
      // 投稿日を計算（週2-3回ペースで配分）
      const scheduledDate = new Date(baseDate)
      scheduledDate.setDate(scheduledDate.getDate() + Math.floor(index * 3))

      return {
        user_id: user.id,
        title: idea.title,
        hook: idea.hook,
        main_points: idea.main_points,
        call_to_action: idea.call_to_action,
        hashtags: idea.hashtags,
        category: idea.category,
        target_audience: targetAudience,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        status: 'draft',
        generation_prompt: prompt.slice(0, 1000), // 長すぎる場合は切り詰め
        ai_model: 'gpt-4o-mini',
      }
    })

    const { data: savedIdeas, error: insertError } = await supabase
      .from('content_ideas')
      .insert(contentIdeas)
      .select()

    if (insertError) {
      console.error('Failed to save content ideas:', insertError)
      return NextResponse.json(
        { error: 'Failed to save ideas', detail: insertError.message },
        { status: 500 }
      )
    }

    console.log(`[Content Generate] Saved ${savedIdeas?.length} ideas using GPT-4o-mini`)

    return NextResponse.json({
      success: true,
      message: `${savedIdeas?.length}件のコンテンツアイデアを生成しました`,
      ideas: savedIdeas,
    })
  } catch (error) {
    console.error('Content generation error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    return NextResponse.json(
      { error: 'Failed to generate content ideas', detail: errorMessage },
      { status: 500 }
    )
  }
}
