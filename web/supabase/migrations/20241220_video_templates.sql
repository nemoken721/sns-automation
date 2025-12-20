-- 動画テンプレートテーブル

CREATE TABLE IF NOT EXISTS video_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- テンプレート基本情報
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT NOT NULL, -- 'educational', 'entertainment', 'marketing', 'lifestyle'

  -- 利用条件
  plan_required TEXT DEFAULT 'free', -- 'free', 'pro', 'business'
  is_active BOOLEAN DEFAULT TRUE,

  -- テンプレート設定
  settings JSONB NOT NULL DEFAULT '{}',
  -- settings: {
  --   style: 'dynamic' | 'calm' | 'professional',
  --   aspect_ratio: '9:16' | '16:9' | '1:1',
  --   duration_seconds: number,
  --   transitions: 'fade' | 'slide' | 'zoom',
  --   text_animation: 'typewriter' | 'fade' | 'bounce',
  --   music_style: 'upbeat' | 'calm' | 'dramatic',
  --   color_scheme: { primary: string, secondary: string, accent: string }
  -- }

  -- 統計
  usage_count INTEGER DEFAULT 0,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_video_templates_category ON video_templates(category);
CREATE INDEX IF NOT EXISTS idx_video_templates_plan_required ON video_templates(plan_required);
CREATE INDEX IF NOT EXISTS idx_video_templates_is_active ON video_templates(is_active);

-- RLS
ALTER TABLE video_templates ENABLE ROW LEVEL SECURITY;

-- 全員が閲覧可能
CREATE POLICY "Anyone can view active templates" ON video_templates
  FOR SELECT
  USING (is_active = TRUE);

-- サービスロールは全操作可能
CREATE POLICY "Service role can manage all templates" ON video_templates
  FOR ALL
  USING (auth.role() = 'service_role');

-- updated_atを自動更新
CREATE TRIGGER trigger_update_video_templates_updated_at
  BEFORE UPDATE ON video_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- デフォルトテンプレートを挿入
INSERT INTO video_templates (name, description, category, plan_required, settings) VALUES
(
  'シンプル解説',
  'シンプルで見やすい解説動画向けテンプレート',
  'educational',
  'free',
  '{
    "style": "calm",
    "aspect_ratio": "9:16",
    "duration_seconds": 60,
    "transitions": "fade",
    "text_animation": "fade",
    "music_style": "calm",
    "color_scheme": {"primary": "#1a1a2e", "secondary": "#16213e", "accent": "#0f3460"}
  }'
),
(
  'ダイナミック',
  'エネルギッシュなエンタメ動画向けテンプレート',
  'entertainment',
  'free',
  '{
    "style": "dynamic",
    "aspect_ratio": "9:16",
    "duration_seconds": 45,
    "transitions": "zoom",
    "text_animation": "bounce",
    "music_style": "upbeat",
    "color_scheme": {"primary": "#ff6b6b", "secondary": "#4ecdc4", "accent": "#ffe66d"}
  }'
),
(
  'プロフェッショナル',
  'ビジネス・マーケティング向け高品質テンプレート',
  'marketing',
  'pro',
  '{
    "style": "professional",
    "aspect_ratio": "9:16",
    "duration_seconds": 90,
    "transitions": "slide",
    "text_animation": "typewriter",
    "music_style": "dramatic",
    "color_scheme": {"primary": "#2c3e50", "secondary": "#34495e", "accent": "#3498db"}
  }'
),
(
  'ライフスタイル',
  'おしゃれなライフスタイル・Vlog向けテンプレート',
  'lifestyle',
  'pro',
  '{
    "style": "calm",
    "aspect_ratio": "9:16",
    "duration_seconds": 60,
    "transitions": "fade",
    "text_animation": "fade",
    "music_style": "calm",
    "color_scheme": {"primary": "#fef5ed", "secondary": "#d4a373", "accent": "#bc6c25"}
  }'
),
(
  'エンタープライズ',
  '企業向け高品質プレゼンテーションテンプレート',
  'marketing',
  'business',
  '{
    "style": "professional",
    "aspect_ratio": "16:9",
    "duration_seconds": 180,
    "transitions": "slide",
    "text_animation": "typewriter",
    "music_style": "calm",
    "color_scheme": {"primary": "#1a1a1a", "secondary": "#2d2d2d", "accent": "#gold"}
  }'
),
(
  'ミニマル',
  'シンプルで洗練されたミニマルデザイン',
  'lifestyle',
  'free',
  '{
    "style": "calm",
    "aspect_ratio": "9:16",
    "duration_seconds": 30,
    "transitions": "fade",
    "text_animation": "fade",
    "music_style": "calm",
    "color_scheme": {"primary": "#ffffff", "secondary": "#f5f5f5", "accent": "#333333"}
  }'
);

-- videosテーブルにtemplate_id追加
ALTER TABLE videos ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES video_templates(id);
CREATE INDEX IF NOT EXISTS idx_videos_template_id ON videos(template_id);
