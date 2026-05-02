# 📷 Photobooth

A self-hosted photobooth system built for **Raspberry Pi + Pi Camera 3**.  
Touch the screen → 3 photos with live countdown → assembled strip displayed instantly.  
Other devices on the local network can browse the full gallery via a web interface.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend (kiosk + gallery) | Angular 17 (standalone components) |
| Backend | Python 3.11 · FastAPI · WebSocket |
| Camera | picamera2 (Pi Camera 3) · mock mode on non-Pi |
| Image processing | Pillow |
| Reverse proxy | Nginx (Docker) |
| Kiosk browser | Chromium in kiosk mode |

---

## Architecture

```
┌──────────────────────────────────────────────┐
│                Raspberry Pi                  │
│                                              │
│  ┌─────────────┐    ┌──────────────────────┐ │
│  │   Angular   │◄──►│   FastAPI + WS       │ │
│  │  Kiosk UI   │    │   picamera2          │ │
│  │  (port 80)  │    │   Pillow assembly    │ │
│  └─────────────┘    │   (port 8000)        │ │
│                     └──────────────────────┘ │
└──────────────────────────────────────────────┘
         │  WiFi / réseau local
         ▼
┌─────────────────────────┐
│  Autres appareils        │
│  http://<ip-du-pi>/gallery │
└─────────────────────────┘
```

### WebSocket sequence

```
Touch screen
     │
     ├─► countdown 3…2…1  + live preview frames (20fps)  [photo 1]
     ├─► 📸 capture
     ├─► countdown 3…2…1  + live preview frames          [photo 2]
     ├─► 📸 capture
     ├─► countdown 3…2…1  + live preview frames          [photo 3]
     ├─► 📸 capture
     ├─► assembling strip (Pillow)
     └─► result displayed → touch to restart
```

---

## Project structure

```
photobooth/
├── backend/
│   ├── main.py                  # FastAPI app + lifespan
│   ├── config.py                # Settings (pydantic-settings)
│   ├── routers/
│   │   ├── camera.py            # WebSocket /api/camera/ws
│   │   └── gallery.py           # REST /api/gallery
│   ├── services/
│   │   ├── camera_service.py    # picamera2 + mock mode
│   │   └── image_service.py     # Pillow strip assembly
│   ├── storage/photos/          # Saved strips (git-ignored)
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── kiosk/
│   │   │   │   ├── kiosk.component.ts       # Touch UI state machine
│   │   │   │   └── photobooth.service.ts    # WebSocket + RxJS streams
│   │   │   └── gallery/
│   │   │       ├── gallery.component.ts     # Photo grid + lightbox
│   │   │       └── gallery.service.ts       # HTTP REST calls
│   │   ├── environments/
│   │   ├── styles.scss
│   │   └── main.ts
│   ├── proxy.conf.json          # Dev proxy → FastAPI
│   ├── nginx.conf               # Prod reverse proxy
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
├── setup-kiosk.sh               # Pi one-time setup script
└── README.md
```

---

## Quick start — development (non-Pi)

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

> ℹ️ On a non-Pi machine, **mock mode** activates automatically.  
> Animated placeholder frames are generated so the full UI works without a camera.

### Frontend

```bash
cd frontend
npm install
npm start          # starts on http://localhost:4200
                   # proxy.conf.json forwards /api and /ws to :8000
```

---

## Deployment on Raspberry Pi

### Option A — Docker (recommended)

```bash
git clone https://github.com/<you>/photobooth.git
cd photobooth
docker compose up -d
```

Then run the kiosk setup:

```bash
sudo bash setup-kiosk.sh
sudo reboot
```

### Option B — Manual

```bash
# Backend as systemd service (see setup-kiosk.sh)
sudo bash setup-kiosk.sh

# Frontend: build and serve via nginx
cd frontend
npm run build:prod
sudo cp -r dist/photobooth/browser /var/www/html
```

---

## Configuration

All backend settings are in `backend/.env`:

| Variable | Default | Description |
|---|---|---|
| `CAMERA_WIDTH` | 1920 | Full-res capture width |
| `CAMERA_HEIGHT` | 1080 | Full-res capture height |
| `PREVIEW_FPS` | 20 | WebSocket preview framerate |
| `COUNTDOWN_SECONDS` | 3 | Countdown duration per photo |
| `PHOTOS_COUNT` | 3 | Number of photos per session |
| `STRIP_BACKGROUND` | #1a1a2e | Strip background color (hex) |

---

## API

### REST

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/gallery` | List all strips (paginated) |
| `GET` | `/api/gallery/{id}` | Get strip metadata |
| `GET` | `/api/gallery/{id}/download` | Download JPEG |
| `DELETE` | `/api/gallery/{id}` | Delete a strip |
| `GET` | `/api/gallery/stats/summary` | Stats (count, size) |
| `GET` | `/health` | Health check |

### WebSocket

`ws://<host>/api/camera/ws`

**Client → Server**
```json
{ "action": "start" }
```

**Server → Client**
```json
{ "type": "frame",      "data": "<base64 jpeg>" }
{ "type": "countdown",  "value": 3, "photo_index": 0 }
{ "type": "capture",    "index": 0 }
{ "type": "processing" }
{ "type": "result",     "strip_b64": "...", "url": "/photos/..." }
{ "type": "error",      "message": "..." }
```

---

## Accessing from other devices

Once the Pi is running, any device on the same WiFi network can open:

```
http://<raspberry-pi-ip>/gallery
```

The IP is shown with: `hostname -I`

---

## Roadmap — v2 ideas

- [ ] QR code on result screen → direct download on phone
- [ ] Customisable frame/overlay on the strip
- [ ] Admin password for delete operations
- [ ] Printer support (CUPS)
- [ ] Multiple strip layouts (2×2, horizontal)
- [ ] Face detection countdown trigger

---

## License

MIT
