import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { PhotoboothService, BoothState } from './photobooth.service';
import QRCode from 'qrcode';
import { SettingsService } from '../settings/settings.service';

@Component({
  selector: 'app-kiosk',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="kiosk-root"
      [class.flash]="isFlashing"
      (click)="onScreenTap()"
    >
      <!-- Live preview / result image -->
      <div class="preview-container">
        <img
          *ngIf="previewFrame || resultStrip"
          [src]="resultStrip || previewFrame"
          class="preview-img"
          [class.result-mode]="state === 'result'"
          alt="Preview"
        />
        <div *ngIf="!previewFrame && !resultStrip" class="no-signal">
          <span class="camera-icon">📷</span>
          <p>Connexion caméra...</p>
        </div>
      </div>

      <!-- Overlay by state -->
      <div class="overlay" [ngSwitch]="state">

        <!-- IDLE: tap to start -->
        <div *ngSwitchCase="'idle'" class="overlay-idle">
          <div class="idle-prompt">
            <div class="pulse-ring"></div>
            <div class="tap-icon">✦</div>
            <p class="tap-text">TOUCHEZ POUR COMMENCER</p>
          </div>
        </div>

        <!-- COUNTDOWN -->
        <div *ngSwitchCase="'countdown'" class="overlay-countdown">
          <div class="photo-dots">
            <span
              *ngFor="let i of getPhotoRange()"
              class="dot"
              [class.active]="i <= currentPhotoIndex"
              [class.current]="i === currentPhotoIndex"
            ></span>
          </div>
          <div class="countdown-number" [attr.data-value]="countdownValue">
            {{ countdownValue }}
          </div>
          <p class="photo-label">Photo {{ currentPhotoIndex + 1 }} / {{ photosTotal }}</p>
        </div>

        <!-- CAPTURE FLASH (handled via CSS class) -->
        <div *ngSwitchCase="'capture'" class="overlay-capture">
          <div class="shutter-text">📸</div>
        </div>

        <!-- PROCESSING -->
        <div *ngSwitchCase="'processing'" class="overlay-processing">
          <div class="spinner"></div>
          <p>Assemblage en cours...</p>
        </div>

        <!-- RESULT -->
        <div *ngSwitchCase="'result'" class="overlay-result">
          <div class="result-hint-container">
            <p class="result-hint">Touchez pour recommencer</p>
          </div>
          <div class="qr-container" *ngIf="qrCodeDataUrl && showQrcode">
            <p class="qr-label">SCANNEZ CE QR CODE POUR TÉLÉCHARGER LA PHOTO</p>
            <img [src]="qrCodeDataUrl" class="qr-code" alt="QR Code" />
          </div>
        </div>

      </div>

      <!-- Error toast -->
      <div *ngIf="errorMessage" class="error-toast">
        ⚠ {{ errorMessage }}
      </div>

      <!-- Gallery link (corner) -->
      <a 
        href="/gallery" 
        class="gallery-link" 
        *ngIf="state === 'idle' || state === 'result'"
        (click)="$event.stopPropagation()"
      >
        Galerie →
      </a>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      font-family: 'Courier New', monospace;
    }

    .kiosk-root {
      position: relative;
      width: 100%;
      height: 100%;
      background: #050510;
      cursor: default;
      user-select: none;
      -webkit-user-select: none;
    }

    /* Flash effect on capture */
    .kiosk-root.flash::after {
      content: '';
      position: absolute;
      inset: 0;
      background: white;
      opacity: 0;
      animation: flashAnim 0.4s ease-out;
      pointer-events: none;
      z-index: 100;
    }
    @keyframes flashAnim {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }

    /* Preview */
    .preview-container {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: all 0.5s ease;
    }

    .preview-img.result-mode {
      object-fit: contain;
      background: #050510;
    }

    .no-signal {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      color: #334;
    }

    .camera-icon { font-size: 64px; }
    .no-signal p { font-size: 18px; letter-spacing: 4px; }

    /* Overlay */
    .overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    /* IDLE */
    .overlay-idle {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 80px;
      background: linear-gradient(to top, rgba(5,5,16,0.85) 0%, transparent 50%);
    }

    .idle-prompt {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .pulse-ring {
      position: absolute;
      width: 120px;
      height: 120px;
      border: 2px solid rgba(100, 120, 255, 0.5);
      border-radius: 50%;
      animation: pulse 2s ease-out infinite;
      margin-bottom: 60px;
    }

    @keyframes pulse {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    .tap-icon {
      font-size: 48px;
      color: #8090ff;
      animation: glow 2s ease-in-out infinite alternate;
    }

    @keyframes glow {
      from { text-shadow: 0 0 10px #4050cc; }
      to { text-shadow: 0 0 30px #8090ff, 0 0 60px #6070ee; }
    }

    .tap-text {
      font-size: 22px;
      letter-spacing: 6px;
      color: #c0c8ff;
      text-transform: uppercase;
      margin: 0;
    }

    /* COUNTDOWN */
    .overlay-countdown {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(5, 5, 16, 0.35);
    }

    .photo-dots {
      display: flex;
      gap: 20px;
      margin-bottom: 40px;
    }

    .dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      border: 2px solid rgba(255,255,255,0.4);
      transition: all 0.3s;
    }

    .dot.active { background: rgba(128, 144, 255, 0.6); }
    .dot.current {
      background: #8090ff;
      box-shadow: 0 0 20px #8090ff;
      transform: scale(1.4);
    }

    .countdown-number {
      font-size: clamp(180px, 30vw, 320px);
      font-weight: 900;
      color: #fff;
      line-height: 1;
      text-shadow:
        0 0 40px rgba(128,144,255,0.8),
        0 0 80px rgba(128,144,255,0.4);
      animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes popIn {
      from { transform: scale(1.5); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .photo-label {
      font-size: 20px;
      letter-spacing: 4px;
      color: rgba(200,210,255,0.7);
      margin-top: 24px;
      text-transform: uppercase;
    }

    /* CAPTURE */
    .overlay-capture {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: captureAnim 0.3s ease;
    }

    @keyframes captureAnim {
      0% { background: rgba(255,255,255,0.8); }
      100% { background: transparent; }
    }

    .shutter-text { font-size: 80px; }

    /* PROCESSING */
    .overlay-processing {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 32px;
      background: rgba(5, 5, 16, 0.75);
      color: #c0c8ff;
      font-size: 20px;
      letter-spacing: 3px;
    }

    .spinner {
      width: 64px;
      height: 64px;
      border: 3px solid rgba(128,144,255,0.2);
      border-top-color: #8090ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* RESULT */
    .overlay-result {
      position: absolute;
      inset: 0;
      pointer-events: all;
    }

    .result-hint-container {
      position: absolute;
      bottom: 40px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
    }

    .result-hint {
      font-size: 20px;
      letter-spacing: 4px;
      color: rgba(200, 210, 255, 0.7);
      margin: 0;
      text-transform: uppercase;
      animation: blink 2s ease-in-out infinite;
    }

    .qr-container {
      position: absolute;
      bottom: 40px;
      right: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      background: rgba(5, 5, 16, 0.85);
      padding: 20px;
      border: 1px solid rgba(128, 144, 255, 0.2);
    }

    .qr-code {
      width: 220px;
      height: 220px;
    }

    .qr-label {
      font-size: 11px;
      letter-spacing: 2px;
      color: rgba(200, 210, 255, 0.7);
      margin: 0;
      text-transform: uppercase;
      text-align: center;
      max-width: 220px;
      line-height: 1.6;
    }

    .result-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .result-hint {
      font-size: 20px;
      letter-spacing: 4px;
      color: rgba(200,210,255,0.7);
      margin: 0;
      text-transform: uppercase;
      animation: blink 2s ease-in-out infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .download-btn {
      display: inline-block;
      padding: 12px 32px;
      border: 1px solid rgba(128,144,255,0.5);
      color: #8090ff;
      text-decoration: none;
      font-size: 16px;
      letter-spacing: 3px;
      text-transform: uppercase;
      transition: all 0.2s;
      pointer-events: all;
    }

    .download-btn:hover {
      background: rgba(128,144,255,0.1);
      border-color: #8090ff;
    }

    /* Error toast */
    .error-toast {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(200, 60, 60, 0.9);
      color: white;
      padding: 12px 24px;
      font-size: 14px;
      letter-spacing: 2px;
      z-index: 200;
    }

    /* Gallery link */
    .gallery-link {
      position: absolute;
      top: 40px;
      right: 24px;
      color: rgba(128,144,255,0.5);
      text-decoration: none;
      font-size: 25px;
      letter-spacing: 3px;
      text-transform: uppercase;
      pointer-events: all;
      transition: color 0.2s;
      z-index: 50;
    }

    .gallery-link:hover { color: #8090ff; }
  `],
})
export class KioskComponent implements OnInit, OnDestroy {
  state: BoothState = 'idle';
  previewFrame: string | null = null;
  resultStrip: string | null = null;
  resultUrl: string | null = null;
  countdownValue = 0;
  currentPhotoIndex = 0;
  isFlashing = false;
  errorMessage: string | null = null;
  photoRange = [0, 1, 2];
  qrCodeDataUrl: string | null = null;
  hostname = window.location.hostname
  showQrcode = true;
  photosTotal = 3;

  private _lastTap = 0;
  private subs = new Subscription();
  private settingsService = inject(SettingsService);

  constructor(
    private booth: PhotoboothService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.booth.connect();

    this.subs.add(this.booth.state$.subscribe((s) => {
      this.state = s;
      // Recharge les settings à chaque retour en idle
      if (s === 'idle') {
        this.settingsService.getSettings().subscribe(cfg => {
          this.showQrcode = cfg.show_qrcode;
          // Compte le nombre de cellules photo
          this.photosTotal = cfg.strip_layout.cells.filter(
            (c: any) => c.type === 'photo'
          ).length || 3;
        });
      }
      this.cdr.markForCheck();
    }));

    this.subs.add(this.booth.previewFrame$.subscribe((f) => {
      if (this.state !== 'result') {
        this.previewFrame = f;
        this.cdr.markForCheck();
      }
    }));

    this.subs.add(this.booth.resultStrip$.subscribe((r) => {
      this.resultStrip = r;
      this.cdr.markForCheck();
    }));

    this.subs.add(this.booth.resultUrl$.subscribe((u) => {
      this.resultUrl = u;
      this.cdr.markForCheck();
    }));

    this.subs.add(this.booth.countdownValue$.subscribe((v) => {
      this.countdownValue = v;
      this.cdr.markForCheck();
    }));

    this.subs.add(this.booth.currentPhotoIndex$.subscribe((i) => {
      this.currentPhotoIndex = i;
      this.cdr.markForCheck();
    }));

    this.subs.add(this.booth.captureFlash$.subscribe(() => {
      this.triggerFlash();
    }));

    this.subs.add(this.booth.error$.subscribe((msg) => {
      this.errorMessage = msg;
      setTimeout(() => { this.errorMessage = null; this.cdr.markForCheck(); }, 4000);
      this.cdr.markForCheck();
    }));

    this.subs.add(this.booth.resultUrl$.subscribe((u) => {
      this.resultUrl = u;
      // Extrait l'ID depuis l'URL /photos/strip_XXXXX_id.jpg
      if (u) {
        const filename = u.split('/').pop() ?? '';
        const parts = filename.replace('.jpg', '').split('_');
        const photoId = parts[parts.length - 1];
        this.generateQrCode(photoId);
      }
      this.cdr.markForCheck();
    }));
  }

  onScreenTap(): void {
    const now = Date.now();
    if (now - this._lastTap < 300) return;
    this._lastTap = now;

    if (this.state === 'idle') {
      // Recharge les settings avant de démarrer la session
      this.settingsService.getSettings().subscribe(cfg => {
        this.showQrcode = cfg.show_qrcode;
        this.photosTotal = cfg.strip_layout.cells.filter(
          (c: any) => c.type === 'photo'
        ).length || 3;
        // Lance la session après chargement
        this.booth.startSession();
      });
    } else if (this.state === 'result') {
      this.resultStrip = null;
      this.resultUrl = null;
      this.booth.resetSession();
    }
  }

  getPhotoRange(): number[] {
    return Array.from({ length: this.photosTotal }, (_, i) => i);
  }

  triggerFlash(): void {
    this.isFlashing = true;
    this.cdr.markForCheck();
    setTimeout(() => { this.isFlashing = false; this.cdr.markForCheck(); }, 400);
  }

  async generateQrCode(photoId: string): Promise<void> {
    // Force l'IP du Pi pour que le téléphone puisse accéder
    const host = window.location.hostname === 'localhost'
      ? '192.168.1.50'
      : window.location.hostname;
    const downloadUrl = `http://${host}:8000/api/gallery/${photoId}/download`;
    try {
      this.qrCodeDataUrl = await QRCode.toDataURL(downloadUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#e0e6ff',
          light: '#050510',
        },
      });
      this.cdr.markForCheck();
    } catch (e) {
      console.error('QR code error', e);
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.booth.disconnect();
  }
}
