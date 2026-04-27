import json
import os
from typing import Any
from config import settings as app_settings

SETTINGS_FILE = "storage/settings.json"

DEFAULT_SETTINGS = {
    "show_qrcode": True,
    "selected_logo": "default",
    "strip_background": "#1a1a2e",
    "strip_background_image": None,
    "strip_layout": {
        "cols": 2,
        "rows": 2,
        "cells": [
            {"type": "logo",  "col": 0, "row": 0, "w": 1, "h": 1},
            {"type": "photo", "index": 0, "col": 1, "row": 0, "w": 1, "h": 1},
            {"type": "photo", "index": 1, "col": 0, "row": 1, "w": 1, "h": 1},
            {"type": "photo", "index": 2, "col": 1, "row": 1, "w": 1, "h": 1},
        ]
    }
}


class SettingsService:

    def get(self) -> dict:
        if not os.path.exists(SETTINGS_FILE):
            self.save(DEFAULT_SETTINGS)
            return DEFAULT_SETTINGS.copy()
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)

    def save(self, data: dict) -> dict:
        os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
        with open(SETTINGS_FILE, "w") as f:
            json.dump(data, f, indent=2)
        return data

    def reset(self) -> dict:
        return self.save(DEFAULT_SETTINGS.copy())

    def update(self, partial: dict) -> dict:
        current = self.get()
        current.update(partial)
        return self.save(current)
