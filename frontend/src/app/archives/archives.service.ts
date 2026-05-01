import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Archive {
  filename: string;
  name: string;
  size_mb: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ArchivesService {
  private get base(): string {
    return `http://${window.location.hostname}:8000/api/archives`;
  }

  constructor(private http: HttpClient) {}

  getArchives(): Observable<{ archives: Archive[] }> {
    return this.http.get<{ archives: Archive[] }>(this.base);
  }

  deleteArchive(filename: string): Observable<any> {
    return this.http.delete(`${this.base}/${filename}`);
  }

  createArchive(name: string): Observable<any> {
    return this.http.post(`${this.base}/create`, { name });
  }

  async downloadArchive(filename: string, token: string): Promise<void> {
    const url = `${this.base}/${filename}/download`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 100);
  }
}
