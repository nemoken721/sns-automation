-- instagram_postsテーブルの作成
-- Instagram投稿の詳細な状態管理用

CREATE TABLE IF NOT EXISTS instagram_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Instagram関連ID
  ig_container_id TEXT,           -- メディアコンテナID
  ig_media_id TEXT,               -- 投稿後のメディアID
  ig_permalink TEXT,              -- Instagram上のURL

  -- 投稿状態
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, uploading, processing, published, failed

  -- エラー情報
  error_code TEXT,                -- エラーコード分類
  error_message TEXT,             -- エラーメッセージ
  retry_count INTEGER DEFAULT 0,  -- リトライ回数
  max_retries INTEGER DEFAULT 3,  -- 最大リトライ回数

  -- スケジュール
  scheduled_at TIMESTAMP WITH TIME ZONE,  -- 予定投稿日時
  published_at TIMESTAMP WITH TIME ZONE,  -- 実際の投稿日時

  -- キャプション
  caption TEXT,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_instagram_posts_video_id ON instagram_posts(video_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_user_id ON instagram_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_status ON instagram_posts(status);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_scheduled_at ON instagram_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_ig_media_id ON instagram_posts(ig_media_id);

-- RLSポリシー
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の投稿のみ閲覧可能
CREATE POLICY "Users can view own instagram posts" ON instagram_posts
  FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分の投稿のみ作成可能
CREATE POLICY "Users can create own instagram posts" ON instagram_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の投稿のみ更新可能
CREATE POLICY "Users can update own instagram posts" ON instagram_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ユーザーは自分の投稿のみ削除可能
CREATE POLICY "Users can delete own instagram posts" ON instagram_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- サービスロールは全操作可能
CREATE POLICY "Service role can manage all instagram posts" ON instagram_posts
  FOR ALL
  USING (auth.role() = 'service_role');

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_instagram_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_instagram_posts_updated_at
  BEFORE UPDATE ON instagram_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_instagram_posts_updated_at();

-- videosテーブルにig_post_id列を追加（既存データとの紐付け用）
-- ALTER TABLE videos ADD COLUMN IF NOT EXISTS ig_post_id UUID REFERENCES instagram_posts(id);
