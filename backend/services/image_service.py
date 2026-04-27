import io
import os
import uuid
from datetime import datetime
from typing import List

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from config import settings
from services.settings_service import SettingsService

import logging

logger = logging.getLogger(__name__)


class ImageService:
    """Assembles individual captures into a photo strip and persists it."""

    def assemble_strip(self, photos: list) -> Image.Image:
        # Charge les settings
        settings_service = SettingsService()
        app_settings_data = settings_service.get()

        pad = 20
        border = 8
        
        # Background
        bg_image_file = app_settings_data.get("strip_background_image")
        bg_color_hex = app_settings_data.get("strip_background", settings.STRIP_BACKGROUND)
        bg_color = self._hex_to_rgb(bg_color_hex)

        canvas_w = 1600
        canvas_h = 1000

        # Crée le canvas
        strip = Image.new("RGB", (canvas_w, canvas_h), color=bg_color)

        # Image de fond si définie
        if bg_image_file:
            bg_path = os.path.join("storage/backgrounds", bg_image_file)
            if os.path.exists(bg_path):
                bg_img = Image.open(bg_path).resize((canvas_w, canvas_h), Image.LANCZOS)
                strip.paste(bg_img, (0, 0))

        draw = ImageDraw.Draw(strip)

        # Layout
        layout = app_settings_data.get("strip_layout", {})
        cols = layout.get("cols", 2)
        rows = layout.get("rows", 2)
        cells = layout.get("cells", [])

        cell_w = canvas_w // cols
        cell_h = canvas_h // rows

        # Fonts
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
        except:
            font_large = ImageFont.load_default()

        photo_index = 0
        for cell in cells:
            col = cell.get("col", 0)
            row = cell.get("row", 0)
            w = cell.get("w", 1)
            h = cell.get("h", 1)
            cell_type = cell.get("type", "empty")

            x = col * cell_w + pad
            y = row * cell_h + pad
            cw = cell_w * w - pad * 2
            ch = cell_h * h - pad * 2

            if cell_type == "photo":
                idx = cell.get("index", photo_index)
                if idx < len(photos):
                    # Bordure blanche
                    draw.rectangle(
                        [x - border, y - border, x + cw + border, y + ch + border],
                        fill=(255, 255, 255)
                    )
                    photo = photos[idx].resize((cw, ch), Image.LANCZOS)
                    strip.paste(photo, (x, y))
                photo_index += 1

            elif cell_type == "logo":
                selected_logo = app_settings_data.get("selected_logo", "default")
                cx = x + cw // 2
                cy = y + ch // 2

                if selected_logo != "default":
                    logo_path = os.path.join("storage/logos", selected_logo)
                    if os.path.exists(logo_path):
                        logo_img = Image.open(logo_path).convert("RGBA")
                        # Redimensionne en gardant le ratio
                        logo_img.thumbnail((cw - 40, ch - 40), Image.LANCZOS)
                        lx = x + (cw - logo_img.width) // 2
                        ly = y + (ch - logo_img.height) // 2
                        strip.paste(logo_img, (lx, ly), logo_img)
                else:
                    draw.text((cx, cy - 60), "✦", fill=(128, 144, 255), anchor="mm", font=font_large)
                    draw.text((cx, cy + 20), "PHOTO", fill=(200, 210, 255), anchor="mm", font=font_large)
                    draw.text((cx, cy + 100), "BOOTH", fill=(200, 210, 255), anchor="mm", font=font_large)

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
