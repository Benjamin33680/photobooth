from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from routers import camera, gallery
from dependencies import camera_service

from routers import camera, gallery, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    os.makedirs("storage/photos", exist_ok=True)
    camera_service.initialize()
    yield
    camera_service.shutdown()


app = FastAPI(
    title="Photobooth API",
    description="Raspberry Pi Photobooth backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated photos as static files
app.mount("/photos", StaticFiles(directory="storage/photos"), name="photos")

app.include_router(camera.router, prefix="/api/camera", tags=["camera"])
app.include_router(gallery.router, prefix="/api/gallery", tags=["gallery"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "camera_ready": camera_service.is_ready()}
