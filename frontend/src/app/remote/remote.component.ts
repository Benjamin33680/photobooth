import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PhotoboothService, BoothState } from '../kiosk/photobooth.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-remote',
  template: `
    <div class="remote-root">

      <!-- Header -->
      <app-header
        title="REMOTE"
        [showRemote]="false"
        [showSettings]="true"
        backLink="/gallery"
      >
      </app-header>

      <!-- IDLE : bouton déclenchement -->
      <div class="idle-view" *ngIf="state === 'idle'">
        <button class="start-btn" (click)="startSession()">
          <div class="btn-inner">
            <span class="btn-label">START</span>
          </div>
        </button>
      </div>

      <!-- COUNTDOWN -->
      <div class="sequence-view" *ngIf="state === 'countdown' || state === 'capture'">
        <div class="photo-dots">
          <span
            *ngFor="let i of getPhotoRange()"
            class="dot"
            [class.active]="i < currentPhotoIndex"
            [class.current]="i === currentPhotoIndex"
          ></span>
        </div>
        <p class="photo-label">Photo {{ currentPhotoIndex + 1 }} / {{ photosTotal }}</p>
        <div class="countdown-number" *ngIf="state === 'countdown'">
          {{ countdownValue }}
        </div>
        <div class="capture-flash" *ngIf="state === 'capture'">📸</div>
      </div>

      <!-- PROCESSING -->
      <div class="processing-view" *ngIf="state === 'processing'">
        <div class="spinner"></div>
        <p>Assemblage en cours...</p>
      </div>

      <!-- RESULT -->
      <div class="result-view" *ngIf="state === 'result'">
        <img *ngIf="resultStrip" [src]="resultStrip" class="result-img" alt="Strip" />
        <div class="result-actions">
          <button
            *ngIf="resultUrl"
            (click)="downloadPhoto()"
            class="download-btn"
          >↓ Télécharger</button>
          <button class="restart-btn" (click)="restart()">
            ↺ Nouvelle série
          </button>
        </div>
      </div>

      <!-- ERROR -->
      <div class="error-toast" *ngIf="errorMessage">⚠ {{ errorMessage }}</div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100vw;
      min-height: 100vh;
      background: #050510;
      font-family: 'Courier New', monospace;
      color: #c0c8ff;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
    }

    .gallery-link, .settings-link {
      color: rgba(128,144,255,0.5);
      text-decoration: none;
      font-size: 13px;
      letter-spacing: 3px;
      text-transform: uppercase;
      transition: color 0.2s;
    }
    .gallery-link:hover, .settings-link:hover { color: #8090ff; }

    /* Idle */
    .idle-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      gap: 40px;
    }

    .hint {
      font-size: 14px;
      letter-spacing: 3px;
      color: rgba(128,144,255,0.5);
      text-transform: uppercase;
      margin: 0;
    }

    /* Bouton START */
    .start-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: transform 0.15s;
    }
    .start-btn:hover { transform: scale(1.05); }
    .start-btn:active { transform: scale(0.97); }

    .btn-inner {
      width: 220px;
      height: 220px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ff6b6b, #cc2200);
      box-shadow:
        0 8px 0 #8b1500,
        0 12px 30px rgba(200, 40, 0, 0.5),
        inset 0 2px 4px rgba(255,255,255,0.3);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.15s;
    }

    .start-btn:active .btn-inner {
      box-shadow:
        0 2px 0 #8b1500,
        0 4px 15px rgba(200, 40, 0, 0.4),
        inset 0 2px 4px rgba(0,0,0,0.2);
      transform: translateY(4px);
    }

    .btn-icon { font-size: 40px; }

    .btn-label {
      font-size: 30px;
      font-weight: bold;
      letter-spacing: 3px;
      color: white;
      text-align: center;
      line-height: 1.4;
      text-shadow: 0 1px 3px rgba(0,0,0,0.4);
    }

    /* Sequence */
    .sequence-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      gap: 24px;
    }

    .photo-dots {
      display: flex;
      gap: 16px;
    }

    .dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
      border: 2px solid rgba(255,255,255,0.3);
      transition: all 0.3s;
    }
    .dot.active { background: rgba(128,144,255,0.5); }
    .dot.current {
      background: #8090ff;
      box-shadow: 0 0 16px #8090ff;
      transform: scale(1.3);
    }

    .photo-label {
      font-size: 18px;
      letter-spacing: 4px;
      color: rgba(200,210,255,0.7);
      margin: 0;
      text-transform: uppercase;
    }

    .countdown-number {
      font-size: clamp(120px, 25vw, 220px);
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

    .capture-flash { font-size: 80px; }

    /* Processing */
    .processing-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      gap: 32px;
      font-size: 16px;
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

    /* Result */
    .result-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 24px;
    }

    .result-img {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      box-shadow: 0 0 60px rgba(128,144,255,0.15);
    }

    .result-actions {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .download-btn, .restart-btn {
      padding: 14px 32px;
      font-size: 13px;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }

    .download-btn {
      border: 1px solid rgba(128,144,255,0.4);
      color: #8090ff;
      background: none;
    }
    .download-btn:hover { background: rgba(128,144,255,0.1); }

    .restart-btn {
      border: 1px solid rgba(200,210,255,0.2);
      color: rgba(200,210,255,0.6);
      background: none;
    }
    .restart-btn:hover { border-color: rgba(200,210,255,0.4); color: #e0e6ff; }

    /* Error */
    .error-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(200,60,60,0.9);
      color: white;
      padding: 12px 24px;
      font-size: 13px;
      letter-spacing: 2px;
    }
  `],
})
export class RemoteComponent implements OnInit, OnDestroy {
  state: BoothState = 'idle';
  resultStrip: string | null = null;
  resultUrl: string | null = null;
  countdownValue = 0;
  currentPhotoIndex = 0;
  photosTotal = 3;
  errorMessage: string | null = null;
  hostname = window.location.hostname;

  private subs = new Subscription();

  constructor(
    private booth: PhotoboothService,
    private auth: AuthService,
  ) { }

  ngOnInit(): void {
    this.booth.connect();

    // Lit les valeurs courantes immédiatement
    this.state = this.booth.state$.value;
    this.resultStrip = this.booth.resultStrip$.value;
    this.resultUrl = this.booth.resultUrl$.value;
    this.countdownValue = this.booth.countdownValue$.value;
    this.currentPhotoIndex = this.booth.currentPhotoIndex$.value;

    // Puis souscrit aux changements
    this.subs.add(this.booth.state$.subscribe(s => { this.state = s; }));
    this.subs.add(this.booth.countdownValue$.subscribe(v => { this.countdownValue = v; }));
    this.subs.add(this.booth.currentPhotoIndex$.subscribe(i => { this.currentPhotoIndex = i; }));
    this.subs.add(this.booth.resultStrip$.subscribe(r => { this.resultStrip = r; }));
    this.subs.add(this.booth.resultUrl$.subscribe(u => { this.resultUrl = u; }));
    this.subs.add(this.booth.error$.subscribe(msg => {
      this.errorMessage = msg;
      setTimeout(() => this.errorMessage = null, 4000);
    }));

    fetch(`http://${this.hostname}:8000/api/settings`)
      .then(r => r.json())
      .then(cfg => {
        this.photosTotal = cfg.strip_layout.cells.filter(
          (c: any) => c.type === 'photo'
        ).length || 3;
      });
  }

  async downloadPhoto(): Promise<void> {
    if (!this.resultUrl) return;
    const url = `http://${this.hostname}:8000${this.resultUrl}`;
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = URL.createObjectURL(blob);
    a.download = 'photobooth.jpg';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 100);
  }

  startSession(): void {
    this.booth.startSession();
  }

  restart(): void {
    this.booth.resetSession();
  }

  isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  getPhotoRange(): number[] {
    return Array.from({ length: this.photosTotal }, (_, i) => i);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
