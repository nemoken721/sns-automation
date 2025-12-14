-- profilesテーブルにInstagram連携用のカラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ig_user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ig_username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ig_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ig_token_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ig_profile_picture TEXT;

-- videosテーブルにInstagram投稿用のカラムを追加
ALTER TABLE videos ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS ig_media_id TEXT;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_videos_scheduled ON videos(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_status_scheduled ON videos(status, scheduled_at);
