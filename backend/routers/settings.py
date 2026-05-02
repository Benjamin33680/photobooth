import io
import os
import re
import shutil
import zipfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth import require_admin
from services.settings_service import SettingsService
from config import settings as app_settings

router = APIRouter()
settings_service = SettingsService()

LOGOS_DIR = "storage/logos"
BACKGROUNDS_DIR = "storage/backgrounds"
os.makedirs(LOGOS_DIR, exist_ok=True)
os.makedirs(BACKGROUNDS_DIR, exist_ok=True)


# ------------------------------------------------------------------ #
#  Settings CRUD                                                       #
# ------------------------------------------------------------------ #

@router.get("")
async def get_settings():
    return settings_service.get()


@router.post("")
async def save_settings(data: dict, _=Depends(require_admin)):
    return settings_service.save(data)


@router.post("/reset")
async def reset_settings(_=Depends(require_admin)):
    return settings_service.reset()

@router.get("/photos-count")
async def get_photos_count():
    """Retourne le nombre de photos configuré — public pour le kiosk."""
    return {"photos_count": settings_service.get_photos_count()}


# ------------------------------------------------------------------ #
#  Logos                                                               #
# ------------------------------------------------------------------ #

@router.get("/logos")
async def list_logos(_=Depends(require_admin)):
    logos = ["default"]
    if os.path.exists(LOGOS_DIR):
        for f in os.listdir(LOGOS_DIR):
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".svg")):
                logos.append(f)
    return {"logos": logos}


@router.post("/logo")
async def upload_logo(file: UploadFile = File(...), _=Depends(require_admin)):
    filename = file.filename
    filepath = os.path.join(LOGOS_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"filename": filename, "url": f"/logos/{filename}"}

@router.delete("/logo/{filename}")
async def delete_logo(filename: str, _=Depends(require_admin)):
    filepath = os.path.join(LOGOS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Logo not found")
    os.remove(filepath)
    return {"deleted": filename}


# ------------------------------------------------------------------ #
#  Backgrounds                                                         #
# ------------------------------------------------------------------ #

@router.get("/backgrounds")
async def list_backgrounds(_=Depends(require_admin)):
    bgs = []
    if os.path.exists(BACKGROUNDS_DIR):
        for f in os.listdir(BACKGROUNDS_DIR):
            if f.lower().endswith((".png", ".jpg", ".jpeg")):
                bgs.append({"filename": f, "url": f"/backgrounds/{f}"})
    return {"backgrounds": bgs}


@router.post("/background")
async def upload_background(file: UploadFile = File(...), _=Depends(require_admin)):
    filename = file.filename
    filepath = os.path.join(BACKGROUNDS_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"filename": filename, "url": f"/backgrounds/{filename}"}

@router.delete("/background/{filename}")
async def delete_background(filename: str, _=Depends(require_admin)):
    filepath = os.path.join(BACKGROUNDS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Background not found")
    os.remove(filepath)
    return {"deleted": filename}


# ------------------------------------------------------------------ #
#  Export ZIP                                                          #
# ------------------------------------------------------------------ #

@router.get("/export")
async def export_all_photos(_=Depends(require_admin)):
    photos_dir = app_settings.PHOTOS_DIR
    if not os.path.exists(photos_dir):
        raise HTTPException(status_code=404, detail="No photos found")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename in os.listdir(photos_dir):
            if filename.lower().endswith((".jpg", ".jpeg", ".png")):
                zf.write(os.path.join(photos_dir, filename), filename)

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=photobooth_photos.zip"}
    )


# ------------------------------------------------------------------ #
#  Tunnel URL                                                          #
# ------------------------------------------------------------------ #

TUNNEL_LOG = "/home/benji/photobooth/tunnel.log"

@router.get("/tunnel-url")
async def get_tunnel_url():
    try:
        with open(TUNNEL_LOG) as f:
            content = f.read()
        matches = re.findall(r'https://[a-z0-9-]+\.trycloudflare\.com', content)
        if matches:
            return {"url": matches[-1]}
    except Exception:
        pass
    return {"url": None}


# ------------------------------------------------------------------ #
#  Shutdown                                                            #
# ------------------------------------------------------------------ #

@router.post("/shutdown")
async def shutdown_pi(_=Depends(require_admin)):
    import subprocess
    subprocess.Popen(["sudo", "shutdown", "-h", "now"])
    return {"message": "Arrêt en cours..."}
