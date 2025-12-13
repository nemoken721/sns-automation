"""
Pillowを使用したテキスト描画モジュール
"""
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont, ImageFilter

from src.core.config import get_config, get_project_root
from src.core.schemas.video_script import Slide, TextElement, TextAnchor, TextStyle

logger = logging.getLogger(__name__)


class FontManager:
    """フォント管理クラス"""

    def __init__(self):
        config = get_config()
        self.config = config.fonts
        self.fonts_dir = get_project_root() / config.fonts.directory
        self._font_cache: Dict[Tuple[str, int], ImageFont.FreeTypeFont] = {}

    def get_font(self, font_type: str, size: int) -> ImageFont.FreeTypeFont:
        """フォントを取得（キャッシュ付き）"""
        cache_key = (font_type, size)
        if cache_key not in self._font_cache:
            font_file = getattr(self.config, font_type, self.config.regular)
            font_path = self.fonts_dir / font_file
            self._font_cache[cache_key] = ImageFont.truetype(str(font_path), size)
        return self._font_cache[cache_key]

    def get_style_font(self, style: TextStyle) -> Tuple[ImageFont.FreeTypeFont, dict]:
        """スタイルに対応するフォントと設定を取得"""
        style_config = self.config.styles.get(style.value, {})

        if isinstance(style_config, dict):
            font_type = style_config.get("font", "medium")
            size = style_config.get("size", 48)
            color = style_config.get("color", "#FFFFFF")
            stroke_width = style_config.get("stroke_width", 2)
            stroke_color = style_config.get("stroke_color", "#000000")
        else:
            # FontStyleConfigオブジェクトの場合
            font_type = style_config.font if hasattr(style_config, 'font') else "medium"
            size = style_config.size if hasattr(style_config, 'size') else 48
            color = style_config.color if hasattr(style_config, 'color') else "#FFFFFF"
            stroke_width = style_config.stroke_width if hasattr(style_config, 'stroke_width') else 2
            stroke_color = style_config.stroke_color if hasattr(style_config, 'stroke_color') else "#000000"

        font = self.get_font(font_type, size)

        return font, {
            "color": color,
            "stroke_width": stroke_width,
            "stroke_color": stroke_color,
        }


class TextRenderer:
    """テキスト描画クラス"""

    def __init__(self):
        self.font_manager = FontManager()
        config = get_config()
        self.video_width = config.video.width
        self.video_height = config.video.height

    def render_text_on_image(
        self,
        image: Image.Image,
        text_elements: List[TextElement],
    ) -> Image.Image:
        """
        画像にテキストを描画する

        Args:
            image: 背景画像
            text_elements: テキスト要素リスト

        Returns:
            Image.Image: テキストが描画された画像
        """
        # 画像をコピー（元画像を変更しない）
        result = image.copy()

        for element in text_elements:
            result = self._render_single_text(result, element)

        return result

    def _render_single_text(
        self,
        image: Image.Image,
        element: TextElement,
    ) -> Image.Image:
        """単一のテキスト要素を描画"""
        draw = ImageDraw.Draw(image)

        # フォントとスタイル設定を取得
        font, style_config = self.font_manager.get_style_font(element.style)

        # テキストの改行処理
        lines = self._wrap_text(element.content, font, image.width * 0.85)

        # テキストのサイズを計算
        text_bbox = self._get_multiline_bbox(draw, lines, font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]

        # 位置の計算
        x, y = self._calculate_position(
            element.x, element.y,
            element.anchor,
            text_width, text_height,
            image.width, image.height,
        )

        # 背景の半透明ボックスを描画（オプション）
        if element.style in [TextStyle.TITLE, TextStyle.HOOK]:
            padding = 20
            box_coords = (
                x - padding,
                y - padding,
                x + text_width + padding,
                y + text_height + padding,
            )
            # 半透明の黒背景
            overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
            overlay_draw = ImageDraw.Draw(overlay)
            overlay_draw.rounded_rectangle(
                box_coords,
                radius=10,
                fill=(0, 0, 0, 128),
            )
            image = Image.alpha_composite(image.convert('RGBA'), overlay)
            draw = ImageDraw.Draw(image)

        # テキストを描画（縁取り付き）
        self._draw_multiline_text(
            draw, lines, (x, y), font,
            fill=style_config["color"],
            stroke_width=style_config["stroke_width"],
            stroke_fill=style_config["stroke_color"],
        )

        return image

    def _wrap_text(
        self,
        text: str,
        font: ImageFont.FreeTypeFont,
        max_width: float,
    ) -> List[str]:
        """テキストを折り返す"""
        lines = []
        for paragraph in text.split('\n'):
            current_line = ""
            for char in paragraph:
                test_line = current_line + char
                bbox = font.getbbox(test_line)
                if bbox[2] - bbox[0] <= max_width:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                    current_line = char
            if current_line:
                lines.append(current_line)
        return lines

    def _get_multiline_bbox(
        self,
        draw: ImageDraw.Draw,
        lines: List[str],
        font: ImageFont.FreeTypeFont,
    ) -> Tuple[int, int, int, int]:
        """複数行テキストのバウンディングボックスを取得"""
        if not lines:
            return (0, 0, 0, 0)

        max_width = 0
        total_height = 0
        line_height = font.size + 10  # 行間

        for line in lines:
            bbox = font.getbbox(line)
            width = bbox[2] - bbox[0]
            max_width = max(max_width, width)
            total_height += line_height

        return (0, 0, max_width, total_height)

    def _calculate_position(
        self,
        x_percent: int,
        y_percent: int,
        anchor: TextAnchor,
        text_width: int,
        text_height: int,
        image_width: int,
        image_height: int,
    ) -> Tuple[int, int]:
        """テキストの描画位置を計算"""
        # パーセントから絶対座標に変換
        base_x = int(image_width * x_percent / 100)
        base_y = int(image_height * y_percent / 100)

        # アンカーに基づいてオフセットを計算
        x_offset = 0
        y_offset = 0

        if "left" in anchor.value:
            x_offset = 0
        elif "right" in anchor.value:
            x_offset = -text_width
        else:  # center
            x_offset = -text_width // 2

        if "top" in anchor.value:
            y_offset = 0
        elif "bottom" in anchor.value:
            y_offset = -text_height
        else:  # center
            y_offset = -text_height // 2

        return (base_x + x_offset, base_y + y_offset)

    def _draw_multiline_text(
        self,
        draw: ImageDraw.Draw,
        lines: List[str],
        position: Tuple[int, int],
        font: ImageFont.FreeTypeFont,
        fill: str,
        stroke_width: int,
        stroke_fill: str,
    ) -> None:
        """複数行テキストを描画"""
        x, y = position
        line_height = font.size + 10

        for line in lines:
            # 縁取り付きでテキストを描画
            draw.text(
                (x, y),
                line,
                font=font,
                fill=fill,
                stroke_width=stroke_width,
                stroke_fill=stroke_fill,
            )
            y += line_height


class SlideComposer:
    """スライド合成クラス"""

    def __init__(self):
        self.text_renderer = TextRenderer()
        config = get_config()
        self.video_width = config.video.width
        self.video_height = config.video.height

    def compose_slide(
        self,
        background_path: Path,
        slide: Slide,
        output_path: Path,
    ) -> Path:
        """
        背景画像にテキストを合成してスライドを作成

        Args:
            background_path: 背景画像のパス
            slide: スライド情報
            output_path: 出力先パス

        Returns:
            Path: 生成されたスライドのパス
        """
        # 背景画像を読み込み
        background = Image.open(background_path)

        # 動画サイズにリサイズ
        background = self._resize_to_fit(background)

        # RGBAに変換（透明度を扱うため）
        if background.mode != 'RGBA':
            background = background.convert('RGBA')

        # テキストを描画
        result = self.text_renderer.render_text_on_image(
            background,
            slide.text_elements,
        )

        # 保存
        output_path.parent.mkdir(parents=True, exist_ok=True)
        result.save(output_path, 'PNG')

        logger.info(f"Slide composed: {output_path}")
        return output_path

    def compose_all_slides(
        self,
        background_paths: List[Path],
        slides: List[Slide],
        output_dir: Path,
    ) -> List[Path]:
        """
        全スライドを合成

        Args:
            background_paths: 背景画像のパスリスト
            slides: スライドリスト
            output_dir: 出力ディレクトリ

        Returns:
            List[Path]: 生成されたスライドのパスリスト
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        slide_paths = []

        for bg_path, slide in zip(background_paths, slides):
            output_path = output_dir / f"slide_{slide.order:02d}.png"
            slide_path = self.compose_slide(bg_path, slide, output_path)
            slide_paths.append(slide_path)

        return slide_paths

    def _resize_to_fit(self, image: Image.Image) -> Image.Image:
        """画像を動画サイズにリサイズ（アスペクト比を維持してクロップ）"""
        target_ratio = self.video_width / self.video_height
        image_ratio = image.width / image.height

        if image_ratio > target_ratio:
            # 画像が横長すぎる場合
            new_width = int(image.height * target_ratio)
            left = (image.width - new_width) // 2
            image = image.crop((left, 0, left + new_width, image.height))
        else:
            # 画像が縦長すぎる場合
            new_height = int(image.width / target_ratio)
            top = (image.height - new_height) // 2
            image = image.crop((0, top, image.width, top + new_height))

        # 最終サイズにリサイズ
        return image.resize((self.video_width, self.video_height), Image.Resampling.LANCZOS)


def compose_slides(
    background_paths: List[Path],
    slides: List[Slide],
    output_dir: Path,
) -> List[Path]:
    """
    スライドを合成するヘルパー関数

    Args:
        background_paths: 背景画像のパスリスト
        slides: スライドリスト
        output_dir: 出力ディレクトリ

    Returns:
        List[Path]: 生成されたスライドのパスリスト
    """
    composer = SlideComposer()
    return composer.compose_all_slides(background_paths, slides, output_dir)
