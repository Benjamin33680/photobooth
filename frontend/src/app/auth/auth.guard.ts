import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    // Localhost → toujours autorisé
    if (this.auth.isLocalhost()) return true;

    if (this.auth.isLoggedIn()) return true;

    this.router.navigate(['/login']);
    return false;
  }
}
