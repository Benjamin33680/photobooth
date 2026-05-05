#!/bin/bash
# Lance l'environnement de développement (backend :8001 + frontend :4200)
# Usage : ./dev.sh
set -e

REPO="$(cd "$(dirname "$0")" && pwd)"

echo "[dev] Backend → http://localhost:8001"
echo "[dev] Frontend → http://localhost:4200"
echo "[dev] Ctrl+C pour arrêter les deux"

# Lancer le backend dev sur le port 8001
cd "$REPO/backend"
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

# Lancer le frontend dev (proxy configuré vers :8001)
cd "$REPO/frontend"
npm start -- --host 0.0.0.0 --port 4200

# Arrêt propre du backend quand ng serve s'arrête
kill $BACKEND_PID 2>/dev/null
