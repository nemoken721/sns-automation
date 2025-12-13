"""
Gemini APIを使用した台本生成モジュール
"""
import json
import logging
import re
from pathlib import Path
from typing import Optional

import google.generativeai as genai

from .config import get_config, get_project_root
from .schemas.video_script import (
    VideoScript,
    Slide,
    SlideBackground,
    TextElement,
    AudioSettings,
    Caption,
    AnimationType,
    TextAnimationType,
    TextAnchor,
    TextStyle,
    BackgroundStyle,
)

logger = logging.getLogger(__name__)


class ScriptGenerator:
    """Gemini APIを使用して動画台本を生成するクラス"""

    def __init__(self):
        config = get_config()
        self.config = config

        # Gemini APIの設定
        if not config.google_ai_api_key:
            raise ValueError("GOOGLE_AI_API_KEY is not set")

        genai.configure(api_key=config.google_ai_api_key)

        # モデルの初期化
        self.model = genai.GenerativeModel(
            model_name=config.ai.gemini.model,
            generation_config={
                "temperature": config.ai.script_temperature,
                "top_p": config.ai.gemini.top_p,
                "top_k": config.ai.gemini.top_k,
                "max_output_tokens": config.ai.gemini.max_output_tokens,
            }
        )

        # プロンプトテンプレートの読み込み
        prompt_path = get_project_root() / "src" / "core" / "prompts" / "script_prompt.txt"
        with open(prompt_path, "r", encoding="utf-8") as f:
            self.prompt_template = f.read()

    def generate(
        self,
        theme: str,
        target_audience: Optional[str] = None,
        tone: Optional[str] = None,
    ) -> VideoScript:
        """
        テーマから動画台本を生成する

        Args:
            theme: 動画のテーマ
            target_audience: ターゲット層（省略時は設定から取得）
            tone: トーン（省略時は設定から取得）

        Returns:
            VideoScript: 生成された台本
        """
        config = self.config

        # デフォルト値の設定
        if target_audience is None:
            target_audience = config.content.target_audience
        if tone is None:
            tone = config.content.tone_of_voice

        # プロンプトの作成（replace使用でJSON内の{}と衝突を回避）
        prompt = self.prompt_template.replace(
            "{theme}", theme
        ).replace(
            "{target_audience}", target_audience
        ).replace(
            "{tone}", tone
        )

        logger.info(f"Generating script for theme: {theme}")

        # Gemini APIの呼び出し
        response = self.model.generate_content(prompt)

        # レスポンスからJSONを抽出
        response_text = response.text
        json_data = self._extract_json(response_text)

        # VideoScriptオブジェクトに変換
        script = self._parse_script(json_data)

        logger.info(f"Script generated: {script.title} ({script.total_duration:.1f}s)")

        return script

    def _extract_json(self, text: str) -> dict:
        """レスポンステキストからJSONを抽出"""
        # コードブロック内のJSONを探す
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if json_match:
            json_str = json_match.group(1).strip()
        else:
            # コードブロックがない場合は全体をJSONとして扱う
            json_str = text.strip()

        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.debug(f"Raw response: {text}")
            raise ValueError(f"Invalid JSON in response: {e}")

    def _parse_script(self, data: dict) -> VideoScript:
        """JSONデータをVideoScriptオブジェクトに変換"""
        # スライドの変換
        slides = []
        for slide_data in data.get("slides", []):
            # 背景設定
            bg_data = slide_data.get("background", {})
            background = SlideBackground(
                prompt=bg_data.get("prompt", "Abstract business background"),
                style=self._parse_enum(bg_data.get("style", "illustration"), BackgroundStyle),
                color_scheme=bg_data.get("color_scheme", "warm orange and gold"),
            )

            # テキスト要素
            text_elements = []
            for te_data in slide_data.get("text_elements", []):
                text_element = TextElement(
                    content=te_data.get("content", ""),
                    x=te_data.get("x", 50),
                    y=te_data.get("y", 50),
                    anchor=self._parse_enum(te_data.get("anchor", "center"), TextAnchor),
                    style=self._parse_enum(te_data.get("style", "body"), TextStyle),
                    animation=self._parse_enum(te_data.get("animation", "fade_in"), TextAnimationType),
                    animation_delay=te_data.get("animation_delay", 0.0),
                )
                text_elements.append(text_element)

            slide = Slide(
                order=slide_data.get("order", len(slides) + 1),
                duration=slide_data.get("duration", 8.0),
                background=background,
                text_elements=text_elements,
                narration=slide_data.get("narration", ""),
                animation=self._parse_enum(slide_data.get("animation", "zoom_in"), AnimationType),
            )
            slides.append(slide)

        # 音声設定
        audio_data = data.get("audio", {})
        # ナレーションテキストがない場合は、各スライドのナレーションを結合
        narration_text = audio_data.get("narration_text", "")
        if not narration_text:
            narration_text = " ".join(slide.narration for slide in slides)

        audio = AudioSettings(
            narration_text=narration_text,
            voice_id=self.config.fish_audio_voice_id,
            speed=audio_data.get("speed", 1.0),
        )

        # キャプション
        caption_data = data.get("caption", {})
        # 共通ハッシュタグを追加
        hashtags = caption_data.get("hashtags", [])
        common_tags = self.config.content.common_hashtags
        for tag in common_tags:
            if tag not in hashtags:
                hashtags.append(tag)

        caption = Caption(
            text=caption_data.get("text", ""),
            hashtags=hashtags[:30],  # 最大30個
        )

        return VideoScript(
            title=data.get("title", "無題"),
            hook=data.get("hook", ""),
            theme=data.get("theme", ""),
            target_audience=data.get("target_audience", self.config.content.target_audience),
            slides=slides,
            audio=audio,
            caption=caption,
        )

    def _parse_enum(self, value: str, enum_class):
        """文字列をEnumに変換（存在しない場合はデフォルト値）"""
        try:
            # スネークケースに変換して検索
            normalized = value.lower().replace("-", "_").replace(" ", "_")
            for item in enum_class:
                if item.value == normalized:
                    return item
            # 見つからない場合は最初の値を返す
            return list(enum_class)[0]
        except Exception:
            return list(enum_class)[0]


def generate_script(
    theme: str,
    target_audience: Optional[str] = None,
    tone: Optional[str] = None,
) -> VideoScript:
    """
    台本を生成するヘルパー関数

    Args:
        theme: 動画のテーマ
        target_audience: ターゲット層
        tone: トーン

    Returns:
        VideoScript: 生成された台本
    """
    generator = ScriptGenerator()
    return generator.generate(theme, target_audience, tone)
