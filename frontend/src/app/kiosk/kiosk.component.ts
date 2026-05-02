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
import { ConfigService } from '../shared/config.service';

@Component({
  selector: 'app-kiosk',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kiosk.component.html',
  styleUrl: './kiosk.component.scss',
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
  qrCodeDataUrl: string | null = null;
  hostname = window.location.hostname
  showQrcode = true;
  photosTotal = 3;

  private _lastTap = 0;
  private subs = new Subscription();
  private settingsService = inject(SettingsService);

  constructor(
    private booth: PhotoboothService,
    private cdr: ChangeDetectorRef,
    private config: ConfigService
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
    const downloadUrl = `${this.config.apiUrl}/api/gallery/${photoId}/download`;
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
