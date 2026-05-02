import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../shared/config.service';
import { PhotoMeta } from '../models/photo-meta.model';
import { StorageStats } from '../models/storage-stats.model';
import { GalleryResponse } from '../models/gallery-response.model';

export { PhotoMeta, StorageStats, GalleryResponse };

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
