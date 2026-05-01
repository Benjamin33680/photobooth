import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../shared/config.service';

export interface Cell {
  id: number;
  type: 'logo' | 'photo' | 'empty';
  logo?: string;
  photo_index?: number;
  col: number;
  row: number;
  col_span: number;
  row_span: number;
}

export interface StripLayout {
  cols: number;
  rows: number;
  cells: Cell[];
}

export interface AppSettings {
  show_qrcode: boolean;
  remote_enabled: boolean;
  selected_logo: string;
  strip_background: string;
  strip_background_image: string | null;
  strip_layout: StripLayout;
  storage_quota_mb: number;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  isExporting = false;

  constructor(private http: HttpClient, private config: ConfigService) { }

  private get apiUrl(): string {
    return `${this.config.apiUrl}/api/settings`;
  }

  private get storageApiUrl(): string {
    return this.config.apiUrl;
  }

  getSettings(): Observable<AppSettings> {
    return this.http.get<AppSettings>(this.apiUrl);
  }

  saveSettings(data: AppSettings): Observable<AppSettings> {
    return this.http.post<AppSettings>(this.apiUrl, data);
  }

  resetSettings(): Observable<AppSettings> {
    return this.http.post<AppSettings>(`${this.apiUrl}/reset`, {});
  }

  getLogos(): Observable<{ logos: string[] }> {
    return this.http.get<{ logos: string[] }>(`${this.apiUrl}/logos`);
  }

  uploadLogo(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`${this.apiUrl}/logo`, fd);
  }

  deleteLogo(filename: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/logo/${encodeURIComponent(filename)}`);
  }

  getBackgrounds(): Observable<{ backgrounds: { filename: string; url: string }[] }> {
    return this.http.get<any>(`${this.apiUrl}/backgrounds`);
  }

  uploadBackground(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`${this.apiUrl}/background`, fd);
  }

  deleteBackground(filename: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/background/${encodeURIComponent(filename)}`);
  }

  async exportPhotos(token: string): Promise<void> {
    const url = `${this.apiUrl}/export`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = URL.createObjectURL(blob);
    a.download = 'photobooth_photos.zip';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 100);
  }

  shutdown(): Observable<any> {
    return this.http.post(`${this.apiUrl}/shutdown`, {});
  }

  getLogoUrl(logo: string): string {
    if (logo === 'default') return '';
    return `${this.storageApiUrl}/logos/${logo}`;
  }

  getBackgroundUrl(filename: string): string {
    return `${this.storageApiUrl}/backgrounds/${encodeURIComponent(filename)}`;
  }
}