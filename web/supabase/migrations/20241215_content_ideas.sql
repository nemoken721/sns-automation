-- content_ideasテーブルの作成
-- AIが生成したコンテンツアイデアを保存
CREATE TABLE IF NOT EXISTS content_ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- コンテンツ内容
  title TEXT NOT NULL,                    -- タイトル（動画のテーマ）
  hook TEXT,                              -- フック（冒頭の引き）
  main_points TEXT[],                     -- メインポイント（箇条書き）
  call_to_action TEXT,                    -- CTA
  hashtags TEXT[],                        -- ハッシュタグ

  -- カテゴリ・分類
  category TEXT,                          -- カテゴリ（ビジネス、マーケティング等）
  target_audience TEXT,                   -- ターゲット層

  -- スケジュール
  scheduled_date DATE,                    -- 投稿予定日
  scheduled_time TIME DEFAULT '12:00:00', -- 投稿予定時刻

  -- ステータス
  status TEXT DEFAULT 'draft',            -- draft, scheduled, generating, generated, published, failed
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,  -- 生成された動画

  -- AI生成メタデータ
  generation_prompt TEXT,                 -- 生成に使用したプロンプト
  ai_model TEXT DEFAULT 'gpt-4',          -- 使用したAIモデル

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_content_ideas_user_id ON content_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_content_ideas_status ON content_ideas(status);
CREATE INDEX IF NOT EXISTS idx_content_ideas_scheduled_date ON content_ideas(scheduled_date);

-- RLSポリシー
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のアイデアのみ操作可能
CREATE POLICY "Users can manage own content ideas" ON content_ideas
  FOR ALL
  USING (auth.uid() = user_id);

-- user_settingsテーブル（ユーザーごとの設定）
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- コンテンツ生成設定
  content_categories TEXT[] DEFAULT ARRAY['ビジネス', 'マーケティング', '自己啓発'],
  target_audience TEXT DEFAULT '20-40代のビジネスパーソン',
  posting_frequency INTEGER DEFAULT 7,    -- 週に何回投稿するか
  preferred_posting_times TIME[] DEFAULT ARRAY['12:00:00'::TIME, '19:00:00'::TIME],

  -- ブランド設定
  brand_voice TEXT DEFAULT 'プロフェッショナルで親しみやすい',
  brand_keywords TEXT[],

  -- 自動化設定
  auto_generate_enabled BOOLEAN DEFAULT FALSE,
  auto_publish_enabled BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシー
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL
  USING (auth.uid() = user_id);
