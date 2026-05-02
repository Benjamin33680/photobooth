import io
import os
import shutil
import zipfile
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from auth import require_admin
from config import settings as app_settings

router = APIRouter()

ARCHIVES_DIR = "storage/archives"
os.makedirs(ARCHIVES_DIR, exist_ok=True)


class ArchiveRequest(BaseModel):
    name: str


def _get_archives():
    archives = []
    for filename in os.listdir(ARCHIVES_DIR):
        if filename.lower().endswith(".zip"):
            filepath = os.path.join(ARCHIVES_DIR, filename)
            stat = os.stat(filepath)
            archives.append({
                "filename": filename,
                "name": filename.replace(".zip", ""),
                "size_mb": round(stat.st_size / 1_048_576, 2),
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })
    archives.sort(key=lambda x: x["created_at"], reverse=True)
    return archives


@router.get("")
async def list_archives(_=Depends(require_admin)):
    return {"archives": _get_archives()}


@router.post("/create")
async def create_archive(body: ArchiveRequest, _=Depends(require_admin)):
    """Crée un ZIP de toutes les photos, sauvegarde dans archives et vide le dossier photos."""
    photos_dir = app_settings.PHOTOS_DIR

    if not os.path.exists(photos_dir):
        raise HTTPException(status_code=404, detail="Aucune photo trouvée")

    photos = [
        f for f in os.listdir(photos_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]

    if not photos:
        raise HTTPException(status_code=404, detail="Aucune photo à archiver")

    # Nom du fichier ZIP
    safe_name = body.name.strip().replace(" ", "_").replace("/", "_")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{safe_name}_{timestamp}.zip"
    archive_path = os.path.join(ARCHIVES_DIR, filename)

    # Crée le ZIP
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for photo in photos:
            zf.write(os.path.join(photos_dir, photo), photo)

    # Vide le dossier photos
    for photo in photos:
        os.remove(os.path.join(photos_dir, photo))

    return {
        "filename": filename,
        "name": safe_name,
        "photos_count": len(photos),
        "created_at": datetime.now().isoformat(),
    }


@router.get("/{filename}/download")
async def download_archive(filename: str, _=Depends(require_admin)):
    filepath = os.path.join(ARCHIVES_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Archive introuvable")
    return FileResponse(
        filepath,
        media_type="application/zip",
        filename=filename,
    )


@router.delete("/{filename}")
async def delete_archive(filename: str, _=Depends(require_admin)):
    filepath = os.path.join(ARCHIVES_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Archive introuvable")
    os.remove(filepath)
    return {"deleted": True, "filename": filename}
