import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PhotoMeta {
  id: string;
  filename: string;
  url: string;
  created_at: string;
  size_bytes: number;
}

export interface GalleryResponse {
  total: number;
  photos: PhotoMeta[];
}

export interface GalleryStats {
  total_photos: number;
  total_size_mb: number;
  latest: string | null;
}

@Injectable({ providedIn: 'root' })
export class GalleryService {

  constructor(private http: HttpClient) { }

  private get base(): string {
    return `http://${window.location.hostname}:8000/api/gallery`;
  }

  getPhotos(limit = 20, offset = 0): Observable<GalleryResponse> {
    const params = new HttpParams()
      .set('limit', limit)
      .set('offset', offset);
    return this.http.get<GalleryResponse>(this.base, { params });
  }

  getStats(): Observable<GalleryStats> {
    return this.http.get<GalleryStats>(`${this.base}/stats/summary`);
  }

  deletePhoto(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }

  getDownloadUrl(id: string): string {
    const apiUrl = `http://${window.location.hostname}:8000`;
    return `${apiUrl}/api/gallery/${id}/download`;
  }

  getPhotoUrl(photo: PhotoMeta): string {
    const apiUrl = `http://${window.location.hostname}:8000`;
    return `${apiUrl}${photo.url}`;
  }
}
