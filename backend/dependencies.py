# backend/dependencies.py
from services.camera_service import CameraService
from services.image_service import ImageService

camera_service = CameraService()
image_service = ImageService()