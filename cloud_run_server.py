"""
Cloud Run用のHTTPサーバー
動画生成リクエストを受け付けてCloud Storageにアップロード
"""
import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path

from flask import Flask, request, jsonify
from google.cloud import storage
from supabase import create_client, Client

# ロギング設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Google Cloud Storage クライアント
storage_client = storage.Client()
BUCKET_NAME = os.environ.get('GCS_BUCKET_NAME', 'sns-automation-videos-481101')

# Supabase クライアント
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://quniezwdekelumnshhad.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')

def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


@app.route('/health', methods=['GET'])
def health_check():
    """ヘルスチェック"""
    return jsonify({'status': 'healthy'}), 200


@app.route('/generate', methods=['POST'])
def generate_video():
    """動画生成エンドポイント"""
    try:
        data = request.get_json()

        if not data or 'theme' not in data:
            return jsonify({'error': 'theme is required'}), 400

        theme = data['theme']
        video_id = data.get('video_id', str(uuid.uuid4()))
        user_id = data.get('user_id', 'anonymous')

        logger.info(f"Starting video generation: {video_id}, theme: {theme}")

        # 環境変数の確認
        required_env = ['GOOGLE_AI_API_KEY', 'OPENAI_API_KEY', 'FISH_AUDIO_API_KEY', 'FISH_AUDIO_VOICE_ID']
        missing = [env for env in required_env if not os.environ.get(env)]
        if missing:
            return jsonify({'error': f'Missing environment variables: {missing}'}), 500

        # 動画生成
        from src.main import VideoGenerator

        generator = VideoGenerator()
        output_name = f"video_{video_id}"
        video_path = generator.generate(theme, output_name)

        logger.info(f"Video generated: {video_path}")

        # Cloud Storageにアップロード
        bucket = storage_client.bucket(BUCKET_NAME)

        # 動画ファイルをアップロード
        video_blob_name = f"{user_id}/{video_id}/video.mp4"
        video_blob = bucket.blob(video_blob_name)
        video_blob.upload_from_filename(str(video_path))
        video_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{video_blob_name}"

        logger.info(f"Video uploaded: {video_url}")

        # キャプションを読み込み
        caption_path = video_path.parent / "caption.txt"
        caption = ""
        if caption_path.exists():
            caption = caption_path.read_text(encoding='utf-8')

        # スクリプトデータを読み込み
        script_path = video_path.parent / "script.json"
        script_data = None
        title = theme[:50]
        if script_path.exists():
            script_data = json.loads(script_path.read_text(encoding='utf-8'))
            title = script_data.get('title', title)

        # サムネイル（最初のスライド）をアップロード
        thumbnail_url = None
        slides_dir = video_path.parent / "slides"
        if slides_dir.exists():
            slides = sorted(slides_dir.glob("*.png"))
            if slides:
                thumb_blob_name = f"{user_id}/{video_id}/thumbnail.png"
                thumb_blob = bucket.blob(thumb_blob_name)
                thumb_blob.upload_from_filename(str(slides[0]))
                thumbnail_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{thumb_blob_name}"

        # 一時ファイルを削除
        import shutil
        output_dir = video_path.parent
        if output_dir.exists():
            shutil.rmtree(output_dir)

        # Supabaseのvideosテーブルを更新
        if SUPABASE_KEY:
            try:
                supabase = get_supabase()
                supabase.table('videos').update({
                    'status': 'completed',
                    'video_url': video_url,
                    'thumbnail_url': thumbnail_url,
                    'title': title,
                    'caption': caption,
                }).eq('id', video_id).execute()
                logger.info(f"Supabase updated for video: {video_id}")
            except Exception as db_error:
                logger.error(f"Failed to update Supabase: {db_error}")

        return jsonify({
            'success': True,
            'video_id': video_id,
            'video_url': video_url,
            'thumbnail_url': thumbnail_url,
            'title': title,
            'caption': caption,
        }), 200

    except Exception as e:
        logger.error(f"Video generation failed: {e}", exc_info=True)

        # エラー時もSupabaseを更新
        if SUPABASE_KEY and 'video_id' in locals():
            try:
                supabase = get_supabase()
                supabase.table('videos').update({
                    'status': 'failed',
                    'error_message': str(e),
                }).eq('id', video_id).execute()
            except Exception as db_error:
                logger.error(f"Failed to update Supabase on error: {db_error}")

        return jsonify({
            'success': False,
            'error': str(e),
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
