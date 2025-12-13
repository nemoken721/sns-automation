"""
SNS Automation System - メインエントリーポイント

使用方法:
    python -m src.main "動画のテーマ"

例:
    python -m src.main "売上を2倍にする顧客心理学"
"""
import argparse
import json
import logging
import sys
import uuid
from datetime import datetime
from pathlib import Path

from src.core.config import get_config, get_project_root
from src.core.script_generator import ScriptGenerator
from src.generation.image_generator import ImageGenerator
from src.composition.text_renderer import SlideComposer
from src.audio.tts_generator import TTSGenerator
from src.video.video_composer import VideoComposer

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)


class VideoGenerator:
    """動画生成パイプライン"""

    def __init__(self):
        self.config = get_config()
        self.project_root = get_project_root()

        # 各モジュールの初期化
        self.script_generator = ScriptGenerator()
        self.image_generator = ImageGenerator()
        self.slide_composer = SlideComposer()
        self.tts_generator = TTSGenerator()
        self.video_composer = VideoComposer()

    def generate(
        self,
        theme: str,
        output_name: str = None,
    ) -> Path:
        """
        テーマから動画を生成する

        Args:
            theme: 動画のテーマ
            output_name: 出力ファイル名（省略時は自動生成）

        Returns:
            Path: 生成された動画のパス
        """
        # 出力ディレクトリの準備
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        job_id = str(uuid.uuid4())[:8]

        if output_name is None:
            output_name = f"{timestamp}_{job_id}"

        output_dir = self.project_root / self.config.output.directory / output_name
        output_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"=== Starting video generation ===")
        logger.info(f"Theme: {theme}")
        logger.info(f"Output directory: {output_dir}")

        try:
            # Phase 1: 台本生成
            logger.info("Phase 1: Generating script...")
            script = self.script_generator.generate(theme)

            # 台本をJSONとして保存
            script_path = output_dir / "script.json"
            with open(script_path, "w", encoding="utf-8") as f:
                json.dump(script.model_dump(), f, ensure_ascii=False, indent=2, default=str)
            logger.info(f"Script saved: {script_path}")
            logger.info(f"Title: {script.title}")
            logger.info(f"Total duration: {script.total_duration:.1f}s")
            logger.info(f"Slides: {len(script.slides)}")

            # Phase 2: 背景画像生成
            logger.info("Phase 2: Generating background images...")
            backgrounds_dir = output_dir / "backgrounds"
            background_paths = self.image_generator.generate_all_backgrounds(
                script.slides,
                backgrounds_dir,
            )
            logger.info(f"Generated {len(background_paths)} background images")

            # Phase 3: スライド合成（テキストオーバーレイ）
            logger.info("Phase 3: Composing slides...")
            slides_dir = output_dir / "slides"
            slide_paths = self.slide_composer.compose_all_slides(
                background_paths,
                script.slides,
                slides_dir,
            )
            logger.info(f"Composed {len(slide_paths)} slides")

            # Phase 4: 音声生成
            logger.info("Phase 4: Generating narration...")
            audio_path = output_dir / "narration.mp3"
            self.tts_generator.generate_narration(
                script.audio.narration_text,
                audio_path,
            )
            logger.info(f"Narration saved: {audio_path}")

            # Phase 5: 動画合成
            logger.info("Phase 5: Composing video...")
            video_path = output_dir / f"{output_name}.mp4"

            # BGMがあれば使用
            bgm_dir = self.project_root / self.config.audio.bgm.directory
            bgm_files = list(bgm_dir.glob("*.mp3")) + list(bgm_dir.glob("*.wav"))
            bgm_path = bgm_files[0] if bgm_files else None

            self.video_composer.compose_video(
                slide_paths,
                script.slides,
                audio_path,
                video_path,
                bgm_path,
            )

            # キャプションを保存
            caption_path = output_dir / "caption.txt"
            with open(caption_path, "w", encoding="utf-8") as f:
                f.write(script.caption.full_caption())
            logger.info(f"Caption saved: {caption_path}")

            logger.info(f"=== Video generation complete ===")
            logger.info(f"Output: {video_path}")

            return video_path

        except Exception as e:
            logger.error(f"Video generation failed: {e}")
            raise


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(
        description="SNS Automation System - 動画自動生成ツール"
    )
    parser.add_argument(
        "theme",
        type=str,
        help="動画のテーマ（例: '売上を2倍にする顧客心理学'）",
    )
    parser.add_argument(
        "-o", "--output",
        type=str,
        default=None,
        help="出力ファイル名（省略時は自動生成）",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="詳細なログを出力",
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        generator = VideoGenerator()
        video_path = generator.generate(args.theme, args.output)
        print(f"\n[SUCCESS] Video generated: {video_path}")
        return 0
    except Exception as e:
        print(f"\n[ERROR] {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
