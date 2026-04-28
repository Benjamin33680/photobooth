import json
import os

SETTINGS_FILE = "storage/settings.json"

DEFAULT_SETTINGS = {
    "show_qrcode": True,
    "remote_enabled": True,
    "selected_logo": "default",
    "strip_background": "#1a1a2e",
    "strip_background_image": None,
    "strip_layout": {
        "cols": 2,
        "rows": 2,
        "cells": [
            {
                "id": 1,
                "type": "logo",
                "logo": "default",
                "col": 0,
                "row": 0,
                "col_span": 1,
                "row_span": 1
            },
            {
                "id": 2,
                "type": "photo",
                "photo_index": 0,
                "col": 1,
                "row": 0,
                "col_span": 1,
                "row_span": 1
            },
            {
                "id": 3,
                "type": "photo",
                "photo_index": 1,
                "col": 0,
                "row": 1,
                "col_span": 1,
                "row_span": 1
            },
            {
                "id": 4,
                "type": "photo",
                "photo_index": 2,
                "col": 1,
                "row": 1,
                "col_span": 1,
                "row_span": 1
            }
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

    def get_photos_count(self) -> int:
        """Retourne le nombre de cellules photo dans le layout."""
        settings = self.get()
        cells = settings.get("strip_layout", {}).get("cells", [])
        return len([c for c in cells if c.get("type") == "photo"])