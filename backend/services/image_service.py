import io
import os
import uuid
from datetime import datetime
from typing import List

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from config import settings

import logging

logger = logging.getLogger(__name__)


class ImageService:
    """Assembles individual captures into a photo strip and persists it."""

    def assemble_strip(self, photos: list) -> Image.Image:
        pad = 20
        border = 8
        bg_color = self._hex_to_rgb(settings.STRIP_BACKGROUND)

        canvas_w = 1600
        canvas_h = 1000

        strip = Image.new("RGB", (canvas_w, canvas_h), color=bg_color)
        draw = ImageDraw.Draw(strip)

        cell_w = canvas_w // 2
        cell_h = canvas_h // 2

        # Zones : (col, row) -> position
        photo_zones = [
            (cell_w + pad, pad,          cell_w - pad * 2, cell_h - pad * 2),  # photo 1 : haut droite
            (pad,          cell_h + pad, cell_w - pad * 2, cell_h - pad * 2),  # photo 2 : bas gauche
            (cell_w + pad, cell_h + pad, cell_w - pad * 2, cell_h - pad * 2),  # photo 3 : bas droite
        ]

        for i, (x, y, w, h) in enumerate(photo_zones):
            if i >= len(photos):
                break
            # Bordure blanche
            draw.rectangle(
                [x - border, y - border, x + w + border, y + h + border],
                fill=(255, 255, 255)
            )
            photo = photos[i].resize((w, h), Image.LANCZOS)
            strip.paste(photo, (x, y))

        # Zone LOGO : haut gauche
        logo_cx = cell_w // 2
        logo_cy = cell_h // 2

        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
        except:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()

        draw.text((logo_cx, logo_cy - 80), "✦", fill=(128, 144, 255), anchor="mm", font=font_large)
        draw.text((logo_cx, logo_cy),      "PHOTO", fill=(200, 210, 255), anchor="mm", font=font_large)
        draw.text((logo_cx, logo_cy + 90), "BOOTH", fill=(200, 210, 255), anchor="mm", font=font_large)

        return strip

    def save_strip(self, strip: Image.Image) -> dict:
        """Save assembled strip to disk, return metadata."""
        session_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"strip_{timestamp}_{session_id}.jpg"
        filepath = os.path.join(settings.PHOTOS_DIR, filename)

        strip.save(filepath, format="JPEG", quality=92, optimize=True)
        logger.info(f"Saved strip: {filepath}")

        return {
            "id": session_id,
            "filename": filename,
            "url": f"/photos/{filename}",
            "created_at": datetime.now().isoformat(),
            "width": strip.width,
            "height": strip.height,
        }

    def strip_to_base64(self, strip: Image.Image) -> str:
        """Convert strip PIL image to base64 JPEG string for WebSocket delivery."""
        import base64

        buf = io.BytesIO()
        strip.save(buf, format="JPEG", quality=88)
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    # ------------------------------------------------------------------ #
    #  Helpers                                                             #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _hex_to_rgb(hex_color: str) -> tuple:
        hex_color = hex_color.lstrip("#")
        return tuple(int(hex_color[i: i + 2], 16) for i in (0, 2, 4))

    @staticmethod
    def _rounded_corners(img: Image.Image, radius: int) -> Image.Image:
        img = img.convert("RGBA")
        mask = Image.new("L", img.size, 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle([0, 0, img.width, img.height], radius=radius, fill=255)
        img.putalpha(mask)
        return img
