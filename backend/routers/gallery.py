import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel

from config import settings

from auth import get_current_user, require_admin

router = APIRouter()


class PhotoMeta(BaseModel):
    id: str
    filename: str
    url: str
    created_at: str
    size_bytes: int


class GalleryResponse(BaseModel):
    total: int
    photos: List[PhotoMeta]


def _get_all_strips() -> List[PhotoMeta]:
    """Read storage directory and return sorted photo metadata."""
    photos_dir = settings.PHOTOS_DIR
    if not os.path.exists(photos_dir):
        return []

    items = []
    for filename in os.listdir(photos_dir):
        if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        filepath = os.path.join(photos_dir, filename)
        stat = os.stat(filepath)
        # Extract ID from filename: strip_YYYYMMDD_HHMMSS_<id>.jpg
        parts = filename.replace(".jpg", "").split("_")
        photo_id = parts[-1] if len(parts) >= 4 else filename[:8]
        items.append(
            PhotoMeta(
                id=photo_id,
                filename=filename,
                url=f"/photos/{filename}",
                created_at=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                size_bytes=stat.st_size,
            )
        )

    # Newest first
    items.sort(key=lambda x: x.created_at, reverse=True)
    return items


@router.get("", response_model=GalleryResponse)
async def list_photos(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """
    Return paginated list of all photo strips.
    Accessible from any device on the local network.
    """
    all_photos = _get_all_strips()
    paginated = all_photos[offset: offset + limit]
    return GalleryResponse(total=len(all_photos), photos=paginated)


@router.get("/{photo_id}", response_model=PhotoMeta)
async def get_photo_meta(photo_id: str):
    """Return metadata for a single photo strip."""
    all_photos = _get_all_strips()
    for photo in all_photos:
        if photo.id == photo_id:
            return photo
    raise HTTPException(status_code=404, detail="Photo not found")


@router.get("/{photo_id}/download")
async def download_photo(photo_id: str):
    """Download the original JPEG file."""
    all_photos = _get_all_strips()
    for photo in all_photos:
        if photo.id == photo_id:
            filepath = os.path.join(settings.PHOTOS_DIR, photo.filename)
            return FileResponse(
                filepath,
                media_type="image/jpeg",
                filename=photo.filename,
            )
    raise HTTPException(status_code=404, detail="Photo not found")


@router.delete("/{photo_id}")
async def delete_photo(photo_id: str, current_user: dict = Depends(require_admin)):
    """Delete a photo strip (admin use)."""
    all_photos = _get_all_strips()
    for photo in all_photos:
        if photo.id == photo_id:
            filepath = os.path.join(settings.PHOTOS_DIR, photo.filename)
            try:
                os.remove(filepath)
                return {"deleted": True, "id": photo_id}
            except OSError as e:
                raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=404, detail="Photo not found")


@router.get("/stats/summary")
async def gallery_stats():
    """Quick stats for dashboard display."""
    photos = _get_all_strips()
    total_size = sum(p.size_bytes for p in photos)
    return {
        "total_photos": len(photos),
        "total_size_mb": round(total_size / 1_048_576, 2),
        "latest": photos[0].created_at if photos else None,
    }
