"""
FFmpegを使用した動画合成モジュール
"""
import logging
import subprocess
from pathlib import Path
from typing import List, Optional

from src.core.config import get_config, get_project_root
from src.core.schemas.video_script import Slide, VideoScript

logger = logging.getLogger(__name__)


class VideoComposer:
    """FFmpegを使用して動画を合成するクラス"""

    def __init__(self):
        config = get_config()
        self.config = config
        self.video_config = config.video
        self.slide_config = config.slides
        self.project_root = get_project_root()

    def compose_video(
        self,
        slide_paths: List[Path],
        slides: List[Slide],
        audio_path: Path,
        output_path: Path,
        bgm_path: Optional[Path] = None,
        subtitle_path: Optional[Path] = None,
    ) -> Path:
        """
        スライドと音声から動画を合成する

        Args:
            slide_paths: スライド画像のパスリスト
            slides: スライド情報リスト
            audio_path: ナレーション音声のパス
            output_path: 出力先パス
            bgm_path: BGMのパス（オプション）
            subtitle_path: 字幕SRTファイルのパス（オプション）

        Returns:
            Path: 生成された動画のパス
        """
        logger.info("Composing video...")

        # 一時ディレクトリ
        temp_dir = output_path.parent / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)

        # 1. 各スライドを動画化（Ken Burnsエフェクト付き）
        slide_videos = self._create_slide_videos(slide_paths, slides, temp_dir)

        # 2. スライド動画を結合
        concat_video = temp_dir / "concat.mp4"
        self._concat_videos(slide_videos, concat_video)

        # 3. 字幕を追加（ある場合）
        if subtitle_path and subtitle_path.exists():
            subtitled_video = temp_dir / "subtitled.mp4"
            self._add_subtitles(concat_video, subtitle_path, subtitled_video)
            concat_video = subtitled_video

        # 4. 音声を追加
        if bgm_path and bgm_path.exists():
            # BGMがある場合はミックス
            self._add_audio_with_bgm(concat_video, audio_path, bgm_path, output_path)
        else:
            # ナレーションのみ
            self._add_audio(concat_video, audio_path, output_path)

        # 5. 一時ファイルの削除
        if not self.config.output.keep_temp_files:
            self._cleanup_temp_files(temp_dir)

        logger.info(f"Video composed: {output_path}")
        return output_path

    def _create_slide_videos(
        self,
        slide_paths: List[Path],
        slides: List[Slide],
        temp_dir: Path,
    ) -> List[Path]:
        """各スライドを動画化"""
        slide_videos = []

        for slide_path, slide in zip(slide_paths, slides):
            output_path = temp_dir / f"slide_{slide.order:02d}.mp4"

            # Ken Burnsエフェクトの設定
            if self.slide_config.zoom_enabled:
                start_scale = self.slide_config.zoom_start_scale
                end_scale = self.slide_config.zoom_end_scale

                # ズームエフェクトのフィルター
                zoom_filter = (
                    f"scale=8000:-1,"
                    f"zoompan=z='min(zoom+{(end_scale-start_scale)/slide.duration/self.video_config.fps:.6f},1.5)':"
                    f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                    f"d={int(slide.duration * self.video_config.fps)}:"
                    f"s={self.video_config.width}x{self.video_config.height}:"
                    f"fps={self.video_config.fps}"
                )
            else:
                zoom_filter = (
                    f"scale={self.video_config.width}:{self.video_config.height},"
                    f"fps={self.video_config.fps}"
                )

            # FFmpegコマンド
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", str(slide_path),
                "-vf", zoom_filter,
                "-t", str(slide.duration),
                "-c:v", self.video_config.video_codec,
                "-pix_fmt", "yuv420p",
                "-b:v", self.video_config.video_bitrate,
                str(output_path),
            ]

            self._run_ffmpeg(cmd)
            slide_videos.append(output_path)

        return slide_videos

    def _concat_videos(self, video_paths: List[Path], output_path: Path) -> None:
        """複数の動画を結合"""
        # 結合リストファイルを作成
        list_file = output_path.parent / "concat_list.txt"
        with open(list_file, "w", encoding="utf-8") as f:
            for video_path in video_paths:
                # パスをエスケープ
                escaped_path = str(video_path).replace("'", "'\\''")
                f.write(f"file '{escaped_path}'\n")

        # FFmpegで結合
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(list_file),
            "-c", "copy",
            str(output_path),
        ]

        self._run_ffmpeg(cmd)

    def _add_subtitles(
        self,
        video_path: Path,
        subtitle_path: Path,
        output_path: Path,
    ) -> None:
        """
        動画に字幕を焼き込む

        字幕スタイル:
        - 画面下部中央に配置
        - 大きめのフォントサイズ（視認性重視）
        - 白文字＋黒の縁取り（どんな背景でも読みやすい）
        - 半透明の背景ボックス
        """
        logger.info("Adding subtitles to video...")

        # フォントパスを取得
        fonts_dir = self.project_root / self.config.fonts.directory
        font_file = fonts_dir / self.config.fonts.bold

        # フォントが存在しない場合はデフォルトを使用
        if not font_file.exists():
            logger.warning(f"Font not found: {font_file}, using system default")
            font_file = None

        # 字幕フィルター設定
        # 画面中央より少し下に配置（画面の約70%の位置）
        # 1080x1920 (9:16) の画面で読みやすいサイズ
        # MarginV は下からの距離: 1920 * 0.28 = 約538px (画面の72%の位置に表示)
        subtitle_style = (
            "FontSize=36,"                # プロフェッショナルなサイズ
            "FontName=Noto Sans JP Bold,"
            "PrimaryColour=&H00FFFFFF,"   # 白文字
            "OutlineColour=&H00000000,"   # 黒の縁取り
            "BackColour=&H99000000,"      # 半透明黒（99 = 約60%不透明度、後ろが少し見える）
            "BorderStyle=4,"              # 縁取り + 半透明背景ボックス
            "Outline=2,"                  # 縁取り太さ
            "Shadow=0,"                   # シャドウなし（クリーンな見た目）
            "MarginV=540,"                # 画面中央やや下（下から540px = 画面の約72%位置）
            "MarginL=60,"                 # 左右マージン（少し広めに）
            "MarginR=60,"
            "Alignment=2"                 # 下部中央揃え
        )

        # パスをエスケープ（Windowsのバックスラッシュ対応）
        srt_path_escaped = str(subtitle_path).replace('\\', '/').replace(':', '\\:')

        # 字幕フィルター
        if font_file:
            font_path_escaped = str(font_file).replace('\\', '/').replace(':', '\\:')
            subtitle_filter = (
                f"subtitles='{srt_path_escaped}':"
                f"fontsdir='{str(fonts_dir).replace(chr(92), '/').replace(':', chr(92)+':')}':"
                f"force_style='{subtitle_style}'"
            )
        else:
            subtitle_filter = (
                f"subtitles='{srt_path_escaped}':"
                f"force_style='{subtitle_style}'"
            )

        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-vf", subtitle_filter,
            "-c:v", self.video_config.video_codec,
            "-b:v", self.video_config.video_bitrate,
            "-c:a", "copy",
            str(output_path),
        ]

        self._run_ffmpeg(cmd)
        logger.info("Subtitles added successfully")

    def _add_audio(
        self,
        video_path: Path,
        audio_path: Path,
        output_path: Path,
    ) -> None:
        """動画に音声を追加"""
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-c:a", self.video_config.audio_codec,
            "-b:a", self.video_config.audio_bitrate,
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            str(output_path),
        ]

        self._run_ffmpeg(cmd)

    def _add_audio_with_bgm(
        self,
        video_path: Path,
        narration_path: Path,
        bgm_path: Path,
        output_path: Path,
    ) -> None:
        """動画にナレーションとBGMを追加"""
        bgm_volume = self.config.audio.bgm.volume

        # 音声ミックスフィルター
        audio_filter = (
            f"[1:a]volume=1.0[narration];"
            f"[2:a]volume={bgm_volume}[bgm];"
            f"[narration][bgm]amix=inputs=2:duration=first[aout]"
        )

        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-i", str(narration_path),
            "-i", str(bgm_path),
            "-filter_complex", audio_filter,
            "-c:v", "copy",
            "-c:a", self.video_config.audio_codec,
            "-b:a", self.video_config.audio_bitrate,
            "-map", "0:v:0",
            "-map", "[aout]",
            "-shortest",
            str(output_path),
        ]

        self._run_ffmpeg(cmd)

    def _run_ffmpeg(self, cmd: List[str]) -> None:
        """FFmpegコマンドを実行"""
        logger.debug(f"Running FFmpeg: {' '.join(cmd)}")

        try:
            # Windows環境ではエンコーディング問題を回避するため、バイナリモードで実行
            result = subprocess.run(
                cmd,
                capture_output=True,
                check=True,
            )
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.decode('utf-8', errors='ignore') if e.stderr else ''
            logger.error(f"FFmpeg error: {stderr}")
            raise RuntimeError(f"FFmpeg failed: {stderr}")

    def _cleanup_temp_files(self, temp_dir: Path) -> None:
        """一時ファイルを削除"""
        import shutil
        import time
        if temp_dir.exists():
            # Windowsでファイルハンドルが解放されるまで少し待つ
            time.sleep(0.5)
            try:
                shutil.rmtree(temp_dir)
                logger.debug(f"Cleaned up temp directory: {temp_dir}")
            except Exception as e:
                logger.warning(f"Failed to cleanup temp directory: {e}")


def compose_video(
    slide_paths: List[Path],
    slides: List[Slide],
    audio_path: Path,
    output_path: Path,
    bgm_path: Optional[Path] = None,
    subtitle_path: Optional[Path] = None,
) -> Path:
    """
    動画を合成するヘルパー関数

    Args:
        slide_paths: スライド画像のパスリスト
        slides: スライド情報リスト
        audio_path: ナレーション音声のパス
        output_path: 出力先パス
        bgm_path: BGMのパス（オプション）
        subtitle_path: 字幕SRTファイルのパス（オプション）

    Returns:
        Path: 生成された動画のパス
    """
    composer = VideoComposer()
    return composer.compose_video(slide_paths, slides, audio_path, output_path, bgm_path, subtitle_path)
