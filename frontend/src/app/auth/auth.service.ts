import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { SessionStorageService } from './session-storage.service';

export interface AuthUser {
  username: string;
  role: 'admin' | 'user';
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private SESSION_KEY = 'photobooth_user';
  private _user = new BehaviorSubject<AuthUser | null>(null);
  user$ = this._user.asObservable();

  private get apiUrl(): string {
    return `http://${window.location.hostname}:8000/api/auth`;
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private session: SessionStorageService
  ) {
    // Restaure la session
    const stored = this.session.get<AuthUser>(this.SESSION_KEY);
    if (stored) this._user.next(stored);
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap((res) => {
        const user: AuthUser = {
          username: res.username,
          role: res.role,
          token: res.access_token,
        };
        this._user.next(user);
        this.session.set(this.SESSION_KEY, user);
      })
    );
  }

  logout(): void {
    this._user.next(null);
    this.session.remove(this.SESSION_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this._user.value?.token ?? null;
  }

  getRole(): string | null {
    return this._user.value?.role ?? null;
  }

  isLoggedIn(): boolean {
    return this._user.value !== null;
  }

  isAdmin(): boolean {
    return this._user.value?.role === 'admin';
  }

  isLocalhost(): boolean {
    return window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
  }
}
