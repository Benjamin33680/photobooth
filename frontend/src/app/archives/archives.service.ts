import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../shared/config.service';
import { Archive } from '../models/archive.model';

export { Archive };

@Injectable({ providedIn: 'root' })
export class ArchivesService {

  constructor(private http: HttpClient, private config: ConfigService) { }


  private get apiUrl(): string {
    return `${this.config.apiUrl}/api/archives`;
  }


  getArchives(): Observable<{ archives: Archive[] }> {
    return this.http.get<{ archives: Archive[] }>(this.apiUrl);
  }

  deleteArchive(filename: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${filename}`);
  }

  createArchive(name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, { name });
  }

  async downloadArchive(filename: string, token: string): Promise<void> {
    const url = `${this.apiUrl}/${filename}/download`;
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
