import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PhotoboothService } from '../kiosk/photobooth.service';
import { BoothState } from '../models/booth-state.model';
import { AuthService } from '../auth/auth.service';
import { SettingsService } from '../settings/settings.service';
import { ConfigService } from '../shared/config.service';

@Component({
  selector: 'app-remote',
  templateUrl: './remote.component.html',
  styleUrl: './remote.component.scss',
})
export class RemoteComponent implements OnInit, OnDestroy {
  state: BoothState = 'idle';
  resultStrip: string | null = null;
  resultUrl: string | null = null;
  countdownValue = 0;
  currentPhotoIndex = 0;
  photosTotal = 3;
  errorMessage: string | null = null;

  private subs = new Subscription();

  constructor(
    private booth: PhotoboothService,
    private auth: AuthService,
    private settingsService: SettingsService,
    private config: ConfigService,
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

    this.subs.add(this.settingsService.getSettings().subscribe(cfg => {
      this.photosTotal = cfg.strip_layout.cells.filter(
        (c: any) => c.type === 'photo'
      ).length || 3;
    }));
  }

  async downloadPhoto(): Promise<void> {
    if (!this.resultUrl) return;
    const url = `${this.config.apiUrl}${this.resultUrl}`;
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
