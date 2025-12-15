-- video_analyticsテーブルの作成
CREATE TABLE IF NOT EXISTS video_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  ig_media_id TEXT NOT NULL,
  plays INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saved INTEGER DEFAULT 0,
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, collected_at)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_video_analytics_video_id ON video_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_collected_at ON video_analytics(collected_at);

-- RLSポリシー
ALTER TABLE video_analytics ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の動画のアナリティクスのみ閲覧可能
CREATE POLICY "Users can view own video analytics" ON video_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = video_analytics.video_id
      AND videos.user_id = auth.uid()
    )
  );

-- サービスロールは全操作可能
CREATE POLICY "Service role can manage all analytics" ON video_analytics
  FOR ALL
  USING (auth.role() = 'service_role');
