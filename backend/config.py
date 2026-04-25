from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Camera
    CAMERA_WIDTH: int = 1920
    CAMERA_HEIGHT: int = 1080
    PREVIEW_WIDTH: int = 960
    PREVIEW_HEIGHT: int = 540
    PREVIEW_FPS: int = 20

    # Photobooth sequence
    COUNTDOWN_SECONDS: int = 3
    PHOTOS_COUNT: int = 3
    DELAY_BETWEEN_PHOTOS: int = 3  # seconds

    # Storage
    PHOTOS_DIR: str = "storage/photos"
    MAX_STORED_SESSIONS: int = 100

    # Strip layout (assembled image)
    STRIP_COLS: int = 1
    STRIP_ROWS: int = 3
    STRIP_PADDING: int = 20
    STRIP_BACKGROUND: str = "#1a1a2e"

    class Config:
        env_file = ".env"


settings = Settings()
