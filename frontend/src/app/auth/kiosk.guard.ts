import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class KioskGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) { }

  canActivate(): boolean {
    if (this.auth.isLocalhost()) return true;

    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/remote']);
    } else {
      this.router.navigate(['/login']);
    }
    return false;
  }
}