"""
設定ファイルの読み込みと管理
"""
import os
from pathlib import Path
from typing import Any, Dict, Optional

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field


# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent.parent.parent


class VideoConfig(BaseModel):
    """動画設定"""
    width: int = 1080
    height: int = 1920
    fps: int = 30
    max_duration: int = 60
    video_bitrate: str = "8M"
    audio_bitrate: str = "192k"
    video_codec: str = "libx264"
    audio_codec: str = "aac"
    format: str = "mp4"


class SlideConfig(BaseModel):
    """スライド設定"""
    min_slides: int = 4
    max_slides: int = 8
    default_duration: float = 8.0
    transition_duration: float = 0.3
    zoom_enabled: bool = True
    zoom_start_scale: float = 1.0
    zoom_end_scale: float = 1.1


class FontStyleConfig(BaseModel):
    """フォントスタイル設定"""
    font: str = "bold"
    size: int = 48
    color: str = "#FFFFFF"
    stroke_width: int = 2
    stroke_color: str = "#000000"


class FontConfig(BaseModel):
    """フォント設定"""
    directory: str = "assets/fonts"
    regular: str = "NotoSansJP-Regular.ttf"
    medium: str = "NotoSansJP-Medium.ttf"
    bold: str = "NotoSansJP-Bold.ttf"
    black: str = "NotoSansJP-Black.ttf"
    styles: Dict[str, FontStyleConfig] = Field(default_factory=dict)

    def get_font_path(self, font_type: str) -> Path:
        """フォントファイルのパスを取得"""
        font_file = getattr(self, font_type, self.regular)
        return PROJECT_ROOT / self.directory / font_file


class DalleConfig(BaseModel):
    """DALL-E設定"""
    model: str = "dall-e-3"
    size: str = "1024x1792"
    quality: str = "standard"
    style: str = "vivid"


class ImageGenerationConfig(BaseModel):
    """画像生成設定"""
    dalle: DalleConfig = Field(default_factory=DalleConfig)
    prompt_template: str = ""
    default_styles: list = Field(default_factory=list)
    default_color_schemes: list = Field(default_factory=list)


class FishAudioConfig(BaseModel):
    """Fish Audio設定"""
    api_url: str = "https://api.fish.audio/v1/tts"
    format: str = "mp3"
    chunk_length: int = 200
    normalize: bool = True
    latency: str = "normal"


class BGMConfig(BaseModel):
    """BGM設定"""
    directory: str = "assets/bgm"
    volume: float = 0.15


class AudioConfig(BaseModel):
    """音声設定"""
    fish_audio: FishAudioConfig = Field(default_factory=FishAudioConfig)
    speed: float = 1.0
    bgm: BGMConfig = Field(default_factory=BGMConfig)
    normalization_target_lufs: int = -14


class GeminiConfig(BaseModel):
    """Gemini設定"""
    model: str = "gemini-1.5-pro-latest"
    temperature: float = 0.7
    top_p: float = 0.9
    top_k: int = 40
    max_output_tokens: int = 8192


class AIConfig(BaseModel):
    """AI設定"""
    gemini: GeminiConfig = Field(default_factory=GeminiConfig)
    planning_temperature: float = 0.8
    script_temperature: float = 0.5


class ContentConfig(BaseModel):
    """コンテンツ設定"""
    target_audience: str = "中小企業経営者・個人事業主"
    main_themes: list = Field(default_factory=list)
    tone_of_voice: str = "friendly"
    common_hashtags: list = Field(default_factory=list)


class OutputConfig(BaseModel):
    """出力設定"""
    directory: str = "output"
    filename_format: str = "{date}_{title}_{id}"
    temp_directory: str = "output/temp"
    keep_temp_files: bool = False


class LoggingConfig(BaseModel):
    """ログ設定"""
    level: str = "INFO"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    file: str = "logs/app.log"


class Config(BaseModel):
    """アプリケーション設定"""
    video: VideoConfig = Field(default_factory=VideoConfig)
    slides: SlideConfig = Field(default_factory=SlideConfig)
    fonts: FontConfig = Field(default_factory=FontConfig)
    image_generation: ImageGenerationConfig = Field(default_factory=ImageGenerationConfig)
    audio: AudioConfig = Field(default_factory=AudioConfig)
    ai: AIConfig = Field(default_factory=AIConfig)
    content: ContentConfig = Field(default_factory=ContentConfig)
    output: OutputConfig = Field(default_factory=OutputConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)

    # 環境変数から読み込むAPIキー
    google_ai_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    fish_audio_api_key: Optional[str] = None
    fish_audio_voice_id: Optional[str] = None


def load_config(config_path: Optional[Path] = None) -> Config:
    """設定ファイルを読み込む"""
    # 環境変数を読み込む
    load_dotenv(PROJECT_ROOT / ".env")

    # 設定ファイルのパス
    if config_path is None:
        config_path = PROJECT_ROOT / "config" / "config.yaml"

    # YAMLを読み込む
    config_dict: Dict[str, Any] = {}
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config_dict = yaml.safe_load(f) or {}

    # ネストされた設定を変換
    if "slides" in config_dict and "zoom" in config_dict["slides"]:
        zoom = config_dict["slides"].pop("zoom")
        config_dict["slides"]["zoom_enabled"] = zoom.get("enabled", True)
        config_dict["slides"]["zoom_start_scale"] = zoom.get("start_scale", 1.0)
        config_dict["slides"]["zoom_end_scale"] = zoom.get("end_scale", 1.1)

    if "audio" in config_dict and "normalization" in config_dict["audio"]:
        norm = config_dict["audio"].pop("normalization")
        config_dict["audio"]["normalization_target_lufs"] = norm.get("target_lufs", -14)

    if "ai" in config_dict:
        ai = config_dict["ai"]
        if "planning" in ai:
            config_dict["ai"]["planning_temperature"] = ai["planning"].get("temperature", 0.8)
            del config_dict["ai"]["planning"]
        if "script" in ai:
            config_dict["ai"]["script_temperature"] = ai["script"].get("temperature", 0.5)
            del config_dict["ai"]["script"]

    # 環境変数からAPIキーを追加
    config_dict["google_ai_api_key"] = os.getenv("GOOGLE_AI_API_KEY")
    config_dict["openai_api_key"] = os.getenv("OPENAI_API_KEY")
    config_dict["fish_audio_api_key"] = os.getenv("FISH_AUDIO_API_KEY")
    config_dict["fish_audio_voice_id"] = os.getenv("FISH_AUDIO_VOICE_ID")

    return Config(**config_dict)


# グローバル設定インスタンス
_config: Optional[Config] = None


def get_config() -> Config:
    """設定を取得（シングルトン）"""
    global _config
    if _config is None:
        _config = load_config()
    return _config


def get_project_root() -> Path:
    """プロジェクトルートを取得"""
    return PROJECT_ROOT
