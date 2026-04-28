import asyncio
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from dependencies import camera_service, image_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Liste de toutes les connexions actives
active_connections: List[WebSocket] = []
last_result: Optional[dict] = None


@router.websocket("/ws")
async def photobooth_websocket(websocket: WebSocket):
    global last_result
    await websocket.accept()
    active_connections.append(websocket)
    logger.info(f"WebSocket connected. Total: {len(active_connections)}")

    # Envoie le dernier résultat au nouveau client si disponible
    if last_result:
        await _send(websocket, last_result)

    camera_service.start_preview_stream()
    preview_task = asyncio.create_task(_stream_preview(websocket))

    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)

            if message.get("action") == "start":
                from services.settings_service import SettingsService
                cfg = SettingsService().get()
                if not cfg.get("remote_enabled", True):
                    await _send(websocket, {"type": "error", "message": "Prise de photo à distance désactivée"})
                    continue
                preview_task.cancel()
                await _run_photobooth_sequence()
                preview_task = asyncio.create_task(_stream_preview(websocket))

            elif message.get("action") == "reset":
                last_result = None
                await _broadcast({"type": "reset"})

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await _send(websocket, {"type": "error", "message": str(e)})
    finally:
        preview_task.cancel()
        if websocket in active_connections:
            active_connections.remove(websocket)
        if not active_connections:
            camera_service.stop_preview_stream()


async def _broadcast(payload: dict):
    """Envoie un message à toutes les connexions actives."""
    disconnected = []
    for ws in active_connections:
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        if ws in active_connections:
            active_connections.remove(ws)


async def _stream_preview(websocket: WebSocket):
    """Preview frames uniquement pour cette connexion."""
    try:
        while True:
            frame_b64 = camera_service.get_latest_frame_b64()
            if frame_b64:
                await _send(websocket, {"type": "frame", "data": frame_b64})
            await asyncio.sleep(1 / 20)
    except asyncio.CancelledError:
        pass


async def _run_photobooth_sequence():
    global last_result
    from config import settings
    from services.settings_service import SettingsService

    settings_svc = SettingsService()
    photos_count = settings_svc.get_photos_count()
    if photos_count == 0:
        photos_count = settings.PHOTOS_COUNT

    photos = []

    for photo_index in range(photos_count):
        for tick in range(settings.COUNTDOWN_SECONDS, 0, -1):
            await _broadcast({
                "type": "countdown",
                "value": tick,
                "photo_index": photo_index,
                "photos_total": photos_count
            })
            await _stream_preview_broadcast(duration=1.0)

        await _broadcast({"type": "capture", "index": photo_index})
        photo = await camera_service.capture_photo()
        photos.append(photo)
        logger.info(f"Captured photo {photo_index + 1}/{photos_count}")

        if photo_index < photos_count - 1:
            await asyncio.sleep(0.5)

    await _broadcast({"type": "processing"})
    strip = image_service.assemble_strip(photos)
    metadata = image_service.save_strip(strip)
    strip_b64 = image_service.strip_to_base64(strip)

    last_result = {
        "type": "result",
        "strip_b64": strip_b64,
        "url": metadata["url"],
        "id": metadata["id"],
        "created_at": metadata["created_at"],
    }
    await _broadcast(last_result)


async def _stream_preview_broadcast(duration: float):
    """Envoie les frames de preview à toutes les connexions pendant duration secondes."""
    start = asyncio.get_event_loop().time()
    while asyncio.get_event_loop().time() - start < duration:
        frame_b64 = camera_service.get_latest_frame_b64()
        if frame_b64:
            await _broadcast({"type": "frame", "data": frame_b64})
        await asyncio.sleep(1 / 20)


async def _send(websocket: WebSocket, payload: dict):
    try:
        await websocket.send_text(json.dumps(payload))
    except Exception:
        pass