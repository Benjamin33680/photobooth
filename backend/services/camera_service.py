import asyncio
import base64
import io
import logging
import threading
import time
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)

# Try to import picamera2 (only available on Raspberry Pi)
try:
    from picamera2 import Picamera2
    from picamera2.encoders import MJPEGEncoder
    PICAMERA_AVAILABLE = True
except ImportError:
    PICAMERA_AVAILABLE = False
    logger.warning("picamera2 not available — running in MOCK mode")

# Pillow is always available
from PIL import Image, ImageDraw, ImageFont


class CameraService:
    """
    Manages the Pi Camera 3 lifecycle.

    On non-Pi environments, falls back to mock mode that generates
    placeholder frames so the full stack can be developed on any machine.
    """

    def __init__(self):
        self._camera: Optional[object] = None
        self._lock = threading.Lock()
        self._latest_frame: Optional[bytes] = None
        self._streaming = False
        self._stream_thread: Optional[threading.Thread] = None

    # ------------------------------------------------------------------ #
    #  Lifecycle                                                           #
    # ------------------------------------------------------------------ #

    def initialize(self):
        if PICAMERA_AVAILABLE:
            self._init_real_camera()
        else:
            logger.info("Mock camera initialized")

    def _init_real_camera(self):
        try:
            self._camera = Picamera2()
            # Preview config (lower res, higher fps)
            preview_config = self._camera.create_preview_configuration(
                main={
                    "size": (settings.PREVIEW_WIDTH, settings.PREVIEW_HEIGHT),
                    "format": "RGB888",
                }
            )
            self._camera.configure(preview_config)
            self._camera.start()
            logger.info("Pi Camera 3 initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize camera: {e}")
            self._camera = None

    def shutdown(self):
        self.stop_preview_stream()
        if self._camera and PICAMERA_AVAILABLE:
            try:
                self._camera.stop()
                self._camera.close()
            except Exception:
                pass

    def is_ready(self) -> bool:
        if PICAMERA_AVAILABLE:
            return self._camera is not None
        return True  # Mock mode is always ready

    # ------------------------------------------------------------------ #
    #  Preview streaming                                                   #
    # ------------------------------------------------------------------ #

    def start_preview_stream(self):
        if self._streaming:
            return
        self._streaming = True
        self._stream_thread = threading.Thread(
            target=self._capture_loop, daemon=True
        )
        self._stream_thread.start()

    def stop_preview_stream(self):
        self._streaming = False
        if self._stream_thread:
            self._stream_thread.join(timeout=2)

    def _capture_loop(self):
        interval = 1.0 / settings.PREVIEW_FPS
        while self._streaming:
            start = time.time()
            frame = self._grab_jpeg_frame()
            if frame:
                with self._lock:
                    self._latest_frame = frame
            elapsed = time.time() - start
            sleep_time = max(0, interval - elapsed)
            time.sleep(sleep_time)

    def get_latest_frame_b64(self) -> Optional[str]:
        with self._lock:
            if self._latest_frame is None:
                return None
            return base64.b64encode(self._latest_frame).decode("utf-8")

    def _grab_jpeg_frame(self) -> Optional[bytes]:
        if PICAMERA_AVAILABLE and self._camera:
            try:
                frame = self._camera.capture_array()
                img = Image.fromarray(frame)
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=75)
                return buf.getvalue()
            except Exception as e:
                logger.error(f"Frame capture error: {e}")
                return None
        else:
            return self._generate_mock_frame()

    # ------------------------------------------------------------------ #
    #  Photo capture                                                       #
    # ------------------------------------------------------------------ #

    async def capture_photo(self) -> Image.Image:
        """Capture a high-resolution still."""
        if PICAMERA_AVAILABLE and self._camera:
            return await asyncio.to_thread(self._capture_hires)
        else:
            return self._generate_mock_photo()

    def _capture_hires(self) -> Image.Image:
        """Switch to full-res config, snap, return to preview config."""
        try:
            self._camera.stop()
            still_config = self._camera.create_still_configuration(
                main={"size": (settings.CAMERA_WIDTH, settings.CAMERA_HEIGHT)}
            )
            self._camera.configure(still_config)
            self._camera.start()
            array = self._camera.capture_array()
            img = Image.fromarray(array)
            
            # Return to preview config
            self._camera.stop()
            preview_config = self._camera.create_preview_configuration(
                main={
                    "size": (settings.PREVIEW_WIDTH, settings.PREVIEW_HEIGHT),
                    "format": "RGB888",
                }
            )
            self._camera.configure(preview_config)
            self._camera.start()
            
            return img
        except Exception as e:
            logger.error(f"Capture hires error: {e}")
            return self._generate_mock_photo()

    # ------------------------------------------------------------------ #
    #  Mock helpers (dev on non-Pi machine)                               #
    # ------------------------------------------------------------------ #

    _mock_frame_count = 0

    def _generate_mock_frame(self) -> bytes:
        CameraService._mock_frame_count += 1
        img = Image.new(
            "RGB",
            (settings.PREVIEW_WIDTH, settings.PREVIEW_HEIGHT),
            color=(20, 20, 40),
        )
        draw = ImageDraw.Draw(img)
        # Animated gradient rectangle
        t = CameraService._mock_frame_count % 100
        x = int(t / 100 * settings.PREVIEW_WIDTH)
        draw.rectangle([x - 60, 0, x + 60, settings.PREVIEW_HEIGHT], fill=(60, 80, 180))
        draw.text((30, 30), "📷 MOCK PREVIEW", fill=(200, 200, 255))
        draw.text(
            (30, 70),
            f"Frame #{CameraService._mock_frame_count}",
            fill=(150, 150, 200),
        )
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=60)
        return buf.getvalue()

    def _generate_mock_photo(self) -> Image.Image:
        img = Image.new("RGB", (settings.CAMERA_WIDTH, settings.CAMERA_HEIGHT), color=(30, 30, 60))
        draw = ImageDraw.Draw(img)
        draw.rectangle([100, 100, img.width - 100, img.height - 100], outline=(100, 120, 220), width=8)
        draw.text((img.width // 2 - 120, img.height // 2 - 20), "📷 MOCK PHOTO", fill=(200, 200, 255))
        return img
