"""
DALL-E 3を使用した背景画像生成モジュール
"""
import logging
import time
from pathlib import Path
from typing import List, Optional

import httpx
from openai import OpenAI

from src.core.config import get_config, get_project_root
from src.core.schemas.video_script import Slide, SlideBackground

logger = logging.getLogger(__name__)


class ImageGenerator:
    """DALL-E 3を使用して背景画像を生成するクラス"""

    def __init__(self):
        config = get_config()
        self.config = config

        if not config.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not set")

        self.client = OpenAI(api_key=config.openai_api_key)
        self.dalle_config = config.image_generation.dalle

    def generate_background(
        self,
        background: SlideBackground,
        output_path: Path,
        retry_count: int = 3,
    ) -> Path:
        """
        背景画像を生成する

        Args:
            background: 背景設定
            output_path: 出力先パス
            retry_count: リトライ回数

        Returns:
            Path: 生成された画像のパス
        """
        # プロンプトの構築
        prompt = self._build_prompt(background)

        logger.info(f"Generating image: {prompt[:100]}...")

        for attempt in range(retry_count):
            try:
                # DALL-E 3 APIの呼び出し
                response = self.client.images.generate(
                    model=self.dalle_config.model,
                    prompt=prompt,
                    size=self.dalle_config.size,
                    quality=self.dalle_config.quality,
                    style=self.dalle_config.style,
                    n=1,
                )

                # 画像URLを取得
                image_url = response.data[0].url

                # 画像をダウンロード
                self._download_image(image_url, output_path)

                logger.info(f"Image saved: {output_path}")
                return output_path

            except Exception as e:
                logger.warning(f"Image generation failed (attempt {attempt + 1}): {e}")
                if attempt < retry_count - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise

    def generate_all_backgrounds(
        self,
        slides: List[Slide],
        output_dir: Path,
    ) -> List[Path]:
        """
        全スライドの背景画像を生成する

        Args:
            slides: スライドリスト
            output_dir: 出力ディレクトリ

        Returns:
            List[Path]: 生成された画像のパスリスト
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        image_paths = []

        for slide in slides:
            output_path = output_dir / f"background_{slide.order:02d}.png"
            image_path = self.generate_background(slide.background, output_path)
            image_paths.append(image_path)

        return image_paths

    def _build_prompt(self, background: SlideBackground) -> str:
        """DALL-E用のプロンプトを構築"""
        base_prompt = background.prompt

        # 必須要件を追加
        requirements = [
            "No text, no letters, no numbers, no characters in the image",
            "Vertical orientation, aspect ratio 9:16",
            "Leave clear space in the center for text overlay",
            "Modern, clean, professional style",
            "No human faces or identifiable people",
        ]

        # カラースキームを追加
        if background.color_scheme:
            requirements.append(f"Color scheme: {background.color_scheme}")

        # スタイルを追加
        style_descriptions = {
            "illustration": "Digital illustration style",
            "abstract": "Abstract artistic style",
            "minimalist": "Minimalist design style",
            "photo": "Photorealistic style",
        }
        style_desc = style_descriptions.get(background.style.value, "")
        if style_desc:
            requirements.append(style_desc)

        # プロンプトを結合
        full_prompt = f"{base_prompt}. Requirements: {', '.join(requirements)}"

        return full_prompt

    def _download_image(self, url: str, output_path: Path) -> None:
        """画像をダウンロードして保存"""
        with httpx.Client(timeout=60.0) as client:
            response = client.get(url)
            response.raise_for_status()

            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(response.content)


def generate_backgrounds(slides: List[Slide], output_dir: Path) -> List[Path]:
    """
    背景画像を生成するヘルパー関数

    Args:
        slides: スライドリスト
        output_dir: 出力ディレクトリ

    Returns:
        List[Path]: 生成された画像のパスリスト
    """
    generator = ImageGenerator()
    return generator.generate_all_backgrounds(slides, output_dir)
