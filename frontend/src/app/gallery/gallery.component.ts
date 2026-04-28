import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { GalleryService, PhotoMeta, GalleryStats } from './gallery.service';

@Component({
  selector: 'app-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gallery-root">

      <!-- Header -->
      <header class="header">
        <h1 class="title">GALERIE</h1>
        <a routerLink="/" class="back-link" *ngIf="isLocalhost()">← Photobooth</a>
        <div class="header-right">
          <div class="stats" *ngIf="stats">
            <span>{{ stats.total_photos }} photos</span>
            <span class="sep">·</span>
            <span>{{ stats.total_size_mb }} MB</span>
          </div>
          <a routerLink="/remote" class="icon-btn" *ngIf="!isLocalhost() && remoteEnabled">
            <mat-icon>camera_alt</mat-icon>
          </a>
          <button class="icon-btn" *ngIf="!isLocalhost()" (click)="refresh()">
            <mat-icon>refresh</mat-icon>
          </button>
          <a routerLink="/settings" class="icon-btn" *ngIf="isAdmin()">
            <mat-icon>settings</mat-icon>
          </a>
          <button class="icon-btn logout" *ngIf="!isLocalhost()" (click)="logout()">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </header>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement...</p>
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading && photos.length === 0" class="empty-state">
        <span class="empty-icon">📷</span>
        <p>Aucune photo pour l'instant.</p>
        <a routerLink="/" class="cta-btn">Prendre des photos →</a>
      </div>

      <!-- Grid -->
      <div class="grid" *ngIf="!loading && photos.length > 0">
        <div
          class="card"
          *ngFor="let photo of photos"
          (click)="openLightbox(photo)"
        >
          <div class="card-img-wrap">
            <img
              [src]="getUrl(photo)"
              [alt]="photo.filename"
              loading="lazy"
              class="card-img"
            />
            <div class="card-overlay">
              <span class="view-icon">⊕</span>
            </div>
          </div>
          <div class="card-meta">
            <span class="card-date">{{ formatDate(photo.created_at) }}</span>
            <div class="card-actions">
              <a
                [href]="getDownloadUrl(photo.id)"
                download
                class="action-btn"
                (click)="$event.stopPropagation()"
                title="Télécharger"
              >↓</a>
              <button
                *ngIf="isAdmin()"
                class="action-btn danger"
                (click)="deletePhoto($event, photo)"
                title="Supprimer"
              >✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Load more -->
      <div class="load-more" *ngIf="hasMore && !loading">
        <button class="load-more-btn" (click)="loadMore()">
          Charger plus
        </button>
      </div>

      <!-- Lightbox -->
      <div class="lightbox" *ngIf="lightboxPhoto" (click)="closeLightbox()">
        <button class="lightbox-close" (click)="closeLightbox()">✕</button>
        <img
          [src]="getUrl(lightboxPhoto)"
          class="lightbox-img"
          (click)="$event.stopPropagation()"
        />
        <div class="lightbox-actions" (click)="$event.stopPropagation()">
          <a
            [href]="getDownloadUrl(lightboxPhoto.id)"
            download
            class="lightbox-btn"
          >↓ Télécharger</a>
          <span class="lightbox-date">{{ formatDate(lightboxPhoto.created_at) }}</span>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #07070f;
      color: #c0c8ff;
      font-family: 'Courier New', monospace;
    }

    /* Header */
    .header {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      background: rgba(7,7,15,0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(128,144,255,0.1);
    }

    .title {
      flex: 1;
      margin: 0;
      font-size: 22px;
      font-weight: 400;
      letter-spacing: 10px;
      color: #e0e6ff;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: none;
      border: 1px solid rgba(128,144,255,0.2);
      border-radius: 50%;
      color: rgba(128,144,255,0.6);
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
      font-size: 20px;
    }
    .icon-btn:hover { border-color: #8090ff; color: #8090ff; }
    .icon-btn.logout { border-color: rgba(255,96,96,0.2); color: rgba(255,96,96,0.5); }
    .icon-btn.logout:hover { border-color: #ff6060; color: #ff6060; }

    .back-link {
      color: rgba(128, 144, 255, 0.6);
      text-decoration: none;
      font-size: 13px;
      letter-spacing: 2px;
      text-transform: uppercase;
      transition: color 0.2s;
    }
    .back-link:hover { color: #8090ff; }

    .stats {
      font-size: 13px;
      color: rgba(128, 144, 255, 0.5);
      letter-spacing: 2px;
      display: flex;
      gap: 8px;
    }
    .sep { opacity: 0.4; }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      height: 60vh;
      color: rgba(128, 144, 255, 0.5);
      letter-spacing: 3px;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 2px solid rgba(128, 144, 255, 0.15);
      border-top-color: #8090ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Empty */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      height: 60vh;
      color: rgba(128, 144, 255, 0.4);
    }

    .empty-icon { font-size: 64px; opacity: 0.4; }
    .empty-state p { font-size: 16px; letter-spacing: 3px; margin: 0; }

    .cta-btn {
      padding: 12px 28px;
      border: 1px solid rgba(128, 144, 255, 0.4);
      color: #8090ff;
      text-decoration: none;
      letter-spacing: 2px;
      font-size: 14px;
      transition: all 0.2s;
    }
    .cta-btn:hover { background: rgba(128, 144, 255, 0.1); }

    /* Grid */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(560px, 1fr));
      gap: 8px;
      padding: 8px;
    }

    .card {
      background: #0d0d1a;
      cursor: pointer;
      overflow: hidden;
      transition: transform 0.2s;
    }
    .card:hover { transform: scale(1.01); z-index: 1; }

    .card-img-wrap {
      position: relative;
      aspect-ratio: 16 / 10;
      overflow: hidden;
    }

    .card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.4s ease;
    }
    .card:hover .card-img { transform: scale(1.04); }

    .card-overlay {
      position: absolute;
      inset: 0;
      background: rgba(5, 5, 20, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .card:hover .card-overlay { opacity: 1; }

    .view-icon {
      font-size: 36px;
      color: rgba(200, 210, 255, 0.9);
    }

    .card-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-top: 1px solid rgba(128, 144, 255, 0.08);
    }

    .card-date {
      font-size: 11px;
      letter-spacing: 1px;
      color: rgba(128, 144, 255, 0.5);
    }

    .card-actions { display: flex; gap: 8px; }

    .action-btn {
      background: none;
      border: 1px solid rgba(128, 144, 255, 0.2);
      color: rgba(128, 144, 255, 0.6);
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      text-decoration: none;
      font-family: inherit;
      transition: all 0.15s;
    }
    .action-btn:hover { border-color: #8090ff; color: #8090ff; }
    .action-btn.danger:hover { border-color: #ff6060; color: #ff6060; }

    /* Load more */
    .load-more {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .load-more-btn {
      background: none;
      border: 1px solid rgba(128, 144, 255, 0.3);
      color: rgba(128, 144, 255, 0.7);
      padding: 14px 40px;
      font-size: 13px;
      letter-spacing: 4px;
      text-transform: uppercase;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
    }
    .load-more-btn:hover { background: rgba(128, 144, 255, 0.08); border-color: #8090ff; }

    /* Lightbox */
    .lightbox {
      position: fixed;
      inset: 0;
      z-index: 200;
      background: rgba(5, 5, 16, 0.97);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .lightbox-close {
      position: absolute;
      top: 24px;
      right: 24px;
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.6);
      width: 44px;
      height: 44px;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .lightbox-close:hover { border-color: #fff; color: #fff; }

    .lightbox-img {
      max-height: 80vh;
      max-width: 90vw;
      object-fit: contain;
      box-shadow: 0 0 80px rgba(128, 144, 255, 0.15);
    }

    .lightbox-actions {
      display: flex;
      align-items: center;
      gap: 32px;
    }

    .lightbox-btn {
      padding: 10px 28px;
      border: 1px solid rgba(128, 144, 255, 0.4);
      color: #8090ff;
      text-decoration: none;
      font-size: 13px;
      letter-spacing: 3px;
      text-transform: uppercase;
      transition: all 0.2s;
      font-family: inherit;
    }
    .lightbox-btn:hover { background: rgba(128, 144, 255, 0.1); }

    .lightbox-date {
      font-size: 12px;
      letter-spacing: 2px;
      color: rgba(128, 144, 255, 0.4);
    }

    @media (max-width: 600px) {
      .header { 
        padding: 10px 16px;
        flex-wrap: wrap;
        gap: 8px;
      }
      .header-right {
        min-width: 5em;
      }
      .title { 
        font-size: 14px; 
        letter-spacing: 4px; 
      }
      .grid { 
        grid-template-columns: repeat(1, 1fr); 
      }
      .stats {
        display: none;
      }
      .header-right {
        gap: 12px;
      }
    }
  `],
})
export class GalleryComponent implements OnInit {
  photos: PhotoMeta[] = [];
  stats: GalleryStats | null = null;
  loading = true;
  hasMore = false;
  lightboxPhoto: PhotoMeta | null = null;

  private limit = 20;
  private offset = 0;
  private auth = inject(AuthService);

  constructor(
    private galleryService: GalleryService,
    private cdr: ChangeDetectorRef
  ) { }

  remoteEnabled = true;

  ngOnInit(): void {
    this.loadPhotos();
    this.loadStats();
    this.checkRemoteEnabled();
  }

  checkRemoteEnabled(): void {
    const host = window.location.hostname;
    fetch(`http://${host}:8000/api/settings`)
      .then(r => r.json())
      .then(cfg => {
        this.remoteEnabled = cfg.remote_enabled ?? true;
        this.cdr.markForCheck();
      });
  }

  loadPhotos(): void {
    this.loading = true;
    this.galleryService.getPhotos(this.limit, this.offset).subscribe({
      next: (res) => {
        this.photos = [...this.photos, ...res.photos];
        this.hasMore = this.photos.length < res.total;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadMore(): void {
    this.offset += this.limit;
    this.loadPhotos();
  }

  loadStats(): void {
    this.galleryService.getStats().subscribe({
      next: (s) => { this.stats = s; this.cdr.markForCheck(); },
      error: () => { },
    });
  }

  refresh(): void {
    this.photos = [];
    this.offset = 0;
    this.loadPhotos();
    this.loadStats();
  }

  getUrl(photo: PhotoMeta): string {
    return this.galleryService.getPhotoUrl(photo);
  }

  getDownloadUrl(id: string): string {
    return this.galleryService.getDownloadUrl(id);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  openLightbox(photo: PhotoMeta): void {
    this.lightboxPhoto = photo;
    this.cdr.markForCheck();
  }

  closeLightbox(): void {
    this.lightboxPhoto = null;
    this.cdr.markForCheck();
  }

  deletePhoto(event: Event, photo: PhotoMeta): void {
    event.stopPropagation();
    if (!confirm('Supprimer cette photo ?')) return;
    this.galleryService.deletePhoto(photo.id).subscribe({
      next: () => {
        this.photos = this.photos.filter((p) => p.id !== photo.id);
        if (this.stats) this.stats.total_photos--;
        this.cdr.markForCheck();
      },
    });
  }

  isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  isLocalhost(): boolean {
    return this.auth.isLocalhost();
  }

  logout(): void {
    this.auth.logout();
  }
}
