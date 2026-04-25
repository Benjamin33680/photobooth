#!/bin/bash
export DISPLAY=:0

# Fond noir
xsetroot -solid "#050510"

# Désactive l'économiseur d'écran
xset s off
xset -dpms
xset s noblank

# Cache le curseur
unclutter -idle 0 &

# Lance Chromium directement sans bureau
chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-features=TranslateUI \
  --no-first-run \
  --disable-translate \
  --overscroll-history-navigation=0 \
  --touch-events=enabled \
  --disable-session-crashed-bubble \
  --password-store=basic \
  --use-mock-keychain \
  --lang=fr \
  file:///home/benji/photobooth/loading.html
