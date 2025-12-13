"""
Fish Audioを使用した音声生成モジュール
"""
import logging
from pathlib import Path
from typing import Optional

import httpx
import ormsgpack

from src.core.config import get_config

logger = logging.getLogger(__name__)


class TTSGenerator:
    """Fish Audio APIを使用してテキストから音声を生成するクラス"""

    def __init__(self):
        config = get_config()
        self.config = config

        if not config.fish_audio_api_key:
            raise ValueError("FISH_AUDIO_API_KEY is not set")

        self.api_key = config.fish_audio_api_key
        self.voice_id = config.fish_audio_voice_id
        self.fish_config = config.audio.fish_audio

    def generate_speech(
        self,
        text: str,
        output_path: Path,
        voice_id: Optional[str] = None,
    ) -> Path:
        """
        テキストから音声を生成する

        Args:
            text: 読み上げるテキスト
            output_path: 出力先パス
            voice_id: 使用するボイスID（省略時は設定から取得）

        Returns:
            Path: 生成された音声ファイルのパス
        """
        if voice_id is None:
            voice_id = self.voice_id

        if not voice_id:
            raise ValueError("Voice ID is not set")

        logger.info(f"Generating speech: {text[:50]}...")

        # リクエストボディの構築
        request_body = {
            "text": text,
            "reference_id": voice_id,
            "format": self.fish_config.format,
            "chunk_length": self.fish_config.chunk_length,
            "normalize": self.fish_config.normalize,
            "latency": self.fish_config.latency,
        }

        # APIリクエスト
        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                self.fish_config.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/msgpack",
                },
                content=ormsgpack.packb(request_body),
            )

            if response.status_code != 200:
                logger.error(f"TTS API error: {response.status_code} - {response.text}")
                raise Exception(f"TTS API error: {response.status_code}")

            # 音声データを保存
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(response.content)

        logger.info(f"Speech saved: {output_path}")
        return output_path

    def generate_narration(
        self,
        narration_text: str,
        output_path: Path,
    ) -> Path:
        """
        ナレーション音声を生成する

        Args:
            narration_text: ナレーションテキスト
            output_path: 出力先パス

        Returns:
            Path: 生成された音声ファイルのパス
        """
        return self.generate_speech(narration_text, output_path)


def generate_narration(text: str, output_path: Path) -> Path:
    """
    ナレーション音声を生成するヘルパー関数

    Args:
        text: ナレーションテキスト
        output_path: 出力先パス

    Returns:
        Path: 生成された音声ファイルのパス
    """
    generator = TTSGenerator()
    return generator.generate_narration(text, output_path)
