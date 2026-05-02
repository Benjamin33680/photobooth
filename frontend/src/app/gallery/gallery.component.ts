import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { GalleryService } from './gallery.service';
import { PhotoMeta } from '../models/photo-meta.model';
import { StorageStats } from '../models/storage-stats.model';
import { ConfigService } from '../shared/config.service';

@Component({
  selector: 'app-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss',
})
export class GalleryComponent implements OnInit {
  photos: PhotoMeta[] = [];
  storageStats: StorageStats | null = null;
  loading = true;
  hasMore = false;
  lightboxPhoto: PhotoMeta | null = null;
  remoteEnabled = false;

  private limit = 20;
  private offset = 0;
  private auth = inject(AuthService);

  constructor(
    private galleryService: GalleryService,
    private cdr: ChangeDetectorRef,
    private config: ConfigService
  ) { }

  ngOnInit(): void {
    this.loadPhotos();
    this.loadStorageStats();
    this.checkRemoteEnabled();
  }

  checkRemoteEnabled(): void {
    fetch(`${this.config.apiUrl}/api/settings`)
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

  refresh(): void {
    this.photos = [];
    this.offset = 0;
    this.loadPhotos();
    this.loadStorageStats();
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
        this.loadStorageStats();
        this.cdr.markForCheck();
      },
    });
  }

  loadStorageStats(): void {
    this.galleryService.getStorageStats().subscribe({
      next: (s) => { this.storageStats = s; this.cdr.markForCheck(); },
      error: () => { },
    });
  }

  isAdmin(): boolean {
    return this.auth.isAdmin();
  }
}
