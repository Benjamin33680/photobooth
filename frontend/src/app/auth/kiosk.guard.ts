import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class KioskGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    // Seul localhost peut accéder au kiosk
    if (this.auth.isLocalhost()) return true;

    this.router.navigate(['/login']);
    return false;
  }
}
