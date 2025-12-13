# SNS Automation Web - セットアップガイド

## 1. Supabase プロジェクト設定

### 1.1 プロジェクト作成
1. [Supabase](https://supabase.com) にログイン
2. 「New Project」をクリック
3. プロジェクト名: `sns-automation`
4. データベースパスワードを設定（安全なものを使用）
5. リージョン: `Northeast Asia (Tokyo)` を推奨
6. 「Create new project」をクリック

### 1.2 データベーススキーマの設定
1. Supabaseダッシュボードで「SQL Editor」を開く
2. 「New query」をクリック
3. `supabase/schema.sql` の内容をコピー＆ペースト
4. 「Run」をクリックして実行

### 1.3 Storage バケットの設定
1. 「Storage」メニューを開く
2. 「New bucket」をクリック
3. バケット名: `videos`、Public: ON
4. 同様に `thumbnails` バケットも作成

### 1.4 認証設定（任意：Google OAuth）
1. 「Authentication」→「Providers」を開く
2. 「Google」を有効化
3. Google Cloud Consoleで OAuth 2.0 クライアントIDを作成
4. クライアントIDとシークレットを設定

## 2. 環境変数の設定

### 2.1 Supabase の API キーを取得
1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下の値をメモ:
   - Project URL: `https://xxxxx.supabase.co`
   - anon public key: `eyJhbGci...`
   - service_role key: `eyJhbGci...`（サーバー側で使用）

### 2.2 .env.local ファイルを作成
```bash
cd web
cp .env.local.example .env.local
```

以下の内容で編集:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Keys (Python動画生成用)
GOOGLE_AI_API_KEY=your-google-ai-api-key
OPENAI_API_KEY=your-openai-api-key
FISH_AUDIO_API_KEY=your-fish-audio-api-key
FISH_AUDIO_VOICE_ID=your-voice-id
```

## 3. 開発サーバーの起動

```bash
cd web
npm run dev
```

ブラウザで http://localhost:3000 を開く

## 4. 動作確認

1. トップページでアカウント作成（新規登録）
2. 確認メールのリンクをクリック（またはSupabaseダッシュボードで確認済みに変更）
3. ログインしてダッシュボードへ
4. テーマを入力して動画生成をテスト

## トラブルシューティング

### 「relation "profiles" does not exist」エラー
→ schema.sql が正しく実行されていません。SQL Editorで再実行してください。

### 認証エラー
→ .env.local の SUPABASE_URL と ANON_KEY が正しいか確認してください。

### 動画生成が開始しない
→ Python仮想環境と依存関係が正しくインストールされているか確認してください。
```bash
cd ..  # プロジェクトルートへ
.\venv\Scripts\activate
pip list
```

## 本番デプロイ

### Vercel へのデプロイ
1. GitHubにリポジトリを作成してプッシュ
2. Vercelでインポート
3. 環境変数を設定
4. デプロイ

注意: 本番環境では動画生成はCloud Run等の別サービスで実行する必要があります。
