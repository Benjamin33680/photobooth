import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface AuthUser {
  username: string;
  role: 'admin' | 'user';
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = new BehaviorSubject<AuthUser | null>(null);
  user$ = this._user.asObservable();

  private get apiUrl(): string {
    return `http://${window.location.hostname}:8000/api/auth`;
  }

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap((res) => {
        this._user.next({
          username: res.username,
          role: res.role,
          token: res.access_token,
        });
      })
    );
  }

  logout(): void {
    this._user.next(null);
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
