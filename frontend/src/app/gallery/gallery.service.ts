import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../shared/config.service';

export interface PhotoMeta {
  id: string;
  filename: string;
  url: string;
  created_at: string;
  size_bytes: number;
}

export interface StorageStats {
  total_photos: number;
  used_bytes: number;
  used_mb: number;
  quota_bytes: number;
  quota_mb: number;
  quota_gb: number;
  percent: number;
}

export interface GalleryResponse {
  total: number;
  photos: PhotoMeta[];
}

@Injectable({ providedIn: 'root' })
export class GalleryService {

  constructor(private http: HttpClient, private config: ConfigService) { }

  private get apiUrl(): string {
    return `${this.config.apiUrl}/api/gallery`;
  }

  getPhotos(limit = 20, offset = 0): Observable<GalleryResponse> {
    const params = new HttpParams()
      .set('limit', limit)
      .set('offset', offset);
    return this.http.get<GalleryResponse>(this.apiUrl, { params });
  }

  deletePhoto(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getDownloadUrl(id: string): string {
    return `${this.config.apiUrl}/api/gallery/${id}/download`;
  }

  getPhotoUrl(photo: PhotoMeta): string {
    const url = photo.url.startsWith('/') ? photo.url : `/${photo.url}`;
    return `${this.config.apiUrl}${url}`;
  }

  getStorageStats(): Observable<StorageStats> {
    return this.http.get<StorageStats>(`${this.apiUrl}/storage/stats`);
  }
}
