-- 管理者ユーザーテーブル

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin', -- 'admin', 'super_admin'
  permissions JSONB DEFAULT '[]', -- 権限リスト

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 管理者は自分の情報を閲覧可能
CREATE POLICY "Admins can view own admin status" ON admin_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- サービスロールは全操作可能
CREATE POLICY "Service role can manage all admin users" ON admin_users
  FOR ALL
  USING (auth.role() = 'service_role');

-- updated_atを自動更新
CREATE TRIGGER trigger_update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- 管理者チェック関数
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
