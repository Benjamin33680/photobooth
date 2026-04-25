import asyncio
import json
import logging
from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from dependencies import camera_service, image_service
from services.image_service import ImageService

logger = logging.getLogger(__name__)
router = APIRouter()

# ------------------------------------------------------------------ #
#  WebSocket — Main photobooth session                                #
# ------------------------------------------------------------------ #


@router.websocket("/ws")
async def photobooth_websocket(websocket: WebSocket):
    """
    WebSocket lifecycle for a full photobooth session.

    Client → Server messages:
      { "action": "start" }   — user touched the screen, begin sequence

    Server → Client messages:
      { "type": "frame",      "data": "<base64 jpeg>" }
      { "type": "countdown",  "value": 3 | 2 | 1 }
      { "type": "capture",    "index": 0 | 1 | 2 }
      { "type": "processing" }
      { "type": "result",     "strip_b64": "...", "url": "/photos/..." }
      { "type": "error",      "message": "..." }
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted")

    # Start preview streaming
    camera_service.start_preview_stream()

    # Send preview frames in background while waiting for "start"
    preview_task = asyncio.create_task(_stream_preview(websocket))

    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)

            if message.get("action") == "start":
                preview_task.cancel()
                await _run_photobooth_sequence(websocket)
                # Restart preview after sequence
                preview_task = asyncio.create_task(_stream_preview(websocket))

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await _send(websocket, {"type": "error", "message": str(e)})
    finally:
        preview_task.cancel()
        camera_service.stop_preview_stream()


async def _stream_preview(websocket: WebSocket):
    """Continuously push preview frames until cancelled."""
    try:
        while True:
            frame_b64 = camera_service.get_latest_frame_b64()
            if frame_b64:
                await _send(websocket, {"type": "frame", "data": frame_b64})
            await asyncio.sleep(1 / 20)  # ~20fps
    except asyncio.CancelledError:
        pass


async def _run_photobooth_sequence(websocket: WebSocket):
    """
    Full photobooth sequence:
      For each of 3 photos:
        1. Countdown 3-2-1 (with live preview frames)
        2. Capture
      Then assemble and send result.
    """
    from config import settings

    photos = []

    for photo_index in range(settings.PHOTOS_COUNT):
        # Countdown with live preview
        for tick in range(settings.COUNTDOWN_SECONDS, 0, -1):
            await _send(websocket, {"type": "countdown", "value": tick, "photo_index": photo_index})
            # Stream frames during countdown
            await _stream_for_duration(websocket, duration=1.0)

        # Capture
        await _send(websocket, {"type": "capture", "index": photo_index})
        photo = await camera_service.capture_photo()
        photos.append(photo)
        logger.info(f"Captured photo {photo_index + 1}/{settings.PHOTOS_COUNT}")

        # Brief pause between photos (except after last)
        if photo_index < settings.PHOTOS_COUNT - 1:
            await asyncio.sleep(0.5)

    # Assemble strip
    await _send(websocket, {"type": "processing"})
    strip = image_service.assemble_strip(photos)
    metadata = image_service.save_strip(strip)
    strip_b64 = image_service.strip_to_base64(strip)

    await _send(websocket, {
        "type": "result",
        "strip_b64": strip_b64,
        "url": metadata["url"],
        "id": metadata["id"],
        "created_at": metadata["created_at"],
    })


async def _stream_for_duration(websocket: WebSocket, duration: float):
    """Push preview frames for a given duration (seconds)."""
    start = asyncio.get_event_loop().time()
    while asyncio.get_event_loop().time() - start < duration:
        frame_b64 = camera_service.get_latest_frame_b64()
        if frame_b64:
            await _send(websocket, {"type": "frame", "data": frame_b64})
        await asyncio.sleep(1 / 20)


async def _send(websocket: WebSocket, payload: dict):
    try:
        await websocket.send_text(json.dumps(payload))
    except Exception:
        pass
