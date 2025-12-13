"""
動画台本のデータスキーマ定義
"""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class AnimationType(str, Enum):
    """スライドアニメーションの種類"""
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    PAN_LEFT = "pan_left"
    PAN_RIGHT = "pan_right"
    NONE = "none"


class TextAnimationType(str, Enum):
    """テキストアニメーションの種類"""
    FADE_IN = "fade_in"
    SLIDE_UP = "slide_up"
    POP = "pop"
    NONE = "none"


class TextAnchor(str, Enum):
    """テキスト配置の基準点"""
    TOP_LEFT = "top_left"
    TOP_CENTER = "top_center"
    TOP_RIGHT = "top_right"
    CENTER_LEFT = "center_left"
    CENTER = "center"
    CENTER_RIGHT = "center_right"
    BOTTOM_LEFT = "bottom_left"
    BOTTOM_CENTER = "bottom_center"
    BOTTOM_RIGHT = "bottom_right"


class TextStyle(str, Enum):
    """テキストスタイルの種類"""
    TITLE = "title"
    BODY = "body"
    EMPHASIS = "emphasis"
    HOOK = "hook"


class BackgroundStyle(str, Enum):
    """背景画像のスタイル"""
    ILLUSTRATION = "illustration"
    ABSTRACT = "abstract"
    MINIMALIST = "minimalist"
    PHOTO = "photo"


class TextElement(BaseModel):
    """スライド上のテキスト要素"""
    content: str = Field(..., description="表示するテキスト内容")
    x: int = Field(50, ge=0, le=100, description="X座標（パーセント）")
    y: int = Field(50, ge=0, le=100, description="Y座標（パーセント）")
    anchor: TextAnchor = Field(TextAnchor.CENTER, description="配置基準点")
    style: TextStyle = Field(TextStyle.BODY, description="テキストスタイル")
    animation: TextAnimationType = Field(TextAnimationType.FADE_IN, description="アニメーション")
    animation_delay: float = Field(0.0, ge=0, description="アニメーション遅延（秒）")


class SlideBackground(BaseModel):
    """スライドの背景設定"""
    prompt: str = Field(..., description="DALL-E用の画像生成プロンプト")
    style: BackgroundStyle = Field(BackgroundStyle.ILLUSTRATION, description="背景スタイル")
    color_scheme: str = Field("warm orange and gold", description="カラースキーム")


class Slide(BaseModel):
    """1枚のスライド"""
    order: int = Field(..., ge=1, description="表示順序")
    duration: float = Field(8.0, ge=3, le=15, description="表示時間（秒）")
    background: SlideBackground = Field(..., description="背景設定")
    text_elements: List[TextElement] = Field(default_factory=list, description="テキスト要素リスト")
    narration: str = Field(..., description="このスライドのナレーション")
    animation: AnimationType = Field(AnimationType.ZOOM_IN, description="スライドアニメーション")


class AudioSettings(BaseModel):
    """音声設定"""
    narration_text: str = Field(..., description="全体のナレーションテキスト")
    voice_id: Optional[str] = Field(None, description="Fish Audio Voice ID")
    speed: float = Field(1.0, ge=0.5, le=2.0, description="読み上げ速度")


class MusicSettings(BaseModel):
    """BGM設定"""
    track_path: Optional[str] = Field(None, description="BGMファイルパス")
    volume: float = Field(0.15, ge=0, le=1.0, description="BGM音量")


class Caption(BaseModel):
    """投稿用キャプション"""
    text: str = Field(..., description="キャプション本文")
    hashtags: List[str] = Field(default_factory=list, max_length=30, description="ハッシュタグ")

    def full_caption(self) -> str:
        """ハッシュタグを含む完全なキャプションを返す"""
        hashtag_str = " ".join(f"#{tag}" for tag in self.hashtags)
        return f"{self.text}\n\n{hashtag_str}" if self.hashtags else self.text


class VideoScript(BaseModel):
    """動画全体の台本"""
    title: str = Field(..., max_length=50, description="動画タイトル")
    hook: str = Field(..., max_length=20, description="冒頭のフック文")
    theme: str = Field(..., description="動画のテーマ")
    target_audience: str = Field("中小企業経営者", description="ターゲット")
    slides: List[Slide] = Field(..., min_length=4, max_length=8, description="スライドリスト")
    audio: AudioSettings = Field(..., description="音声設定")
    music: MusicSettings = Field(default_factory=MusicSettings, description="BGM設定")
    caption: Caption = Field(..., description="投稿キャプション")

    @property
    def total_duration(self) -> float:
        """総再生時間（秒）"""
        return sum(slide.duration for slide in self.slides)

    def validate_duration(self, max_duration: float = 60.0) -> bool:
        """再生時間が制限内かチェック"""
        return self.total_duration <= max_duration
