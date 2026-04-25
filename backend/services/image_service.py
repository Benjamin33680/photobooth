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

    def assemble_strip(self, photos: List[Image.Image]) -> Image.Image:
        """
        Combine N photos into a vertical strip with padding and branding.

        Layout:
          ┌─────────────────────┐
          │      padding        │
          │  ┌───────────────┐  │
          │  │    photo 1    │  │
          │  └───────────────┘  │
          │      padding        │
          │  ┌───────────────┐  │
          │  │    photo 2    │  │
          │  └───────────────┘  │
          │      padding        │
          │  ┌───────────────┐  │
          │  │    photo 3    │  │
          │  └───────────────┘  │
          │  timestamp + logo   │
          └─────────────────────┘
        """
        if not photos:
            raise ValueError("No photos to assemble")

        pad = settings.STRIP_PADDING
        thumb_w = 800
        thumb_h = int(thumb_w * photos[0].height / photos[0].width)

        strip_w = thumb_w + pad * 2
        strip_h = (thumb_h + pad) * len(photos) + pad + 60  # 60px footer

        # Background
        bg_color = self._hex_to_rgb(settings.STRIP_BACKGROUND)
        strip = Image.new("RGB", (strip_w, strip_h), color=bg_color)
        draw = ImageDraw.Draw(strip)

        # Paste each photo
        for i, photo in enumerate(photos):
            thumb = photo.resize((thumb_w, thumb_h), Image.LANCZOS)
            # Subtle rounded corners via mask
            thumb = self._rounded_corners(thumb, radius=12)
            y_offset = pad + i * (thumb_h + pad)
            strip.paste(thumb, (pad, y_offset), thumb if thumb.mode == "RGBA" else None)

        # Footer: timestamp
        footer_y = strip_h - 50
        timestamp = datetime.now().strftime("%d/%m/%Y  %H:%M")
        draw.text(
            (strip_w // 2, footer_y),
            f"✦ {timestamp} ✦",
            fill=(120, 140, 200),
            anchor="mm",
        )

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
