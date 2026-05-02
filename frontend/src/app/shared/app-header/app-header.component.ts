import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent {
  @Input() title = '';
  @Input() showRemote = true;
  @Input() showRefresh = false;
  @Input() showSettings = true;
  @Input() backLink: string | null = null;
  @Input() onRefreshFn: (() => void) | null = null;
  @Input() remoteEnabled = true;

  constructor(private auth: AuthService, private router: Router) { }

  isLocalhost(): boolean {
    return this.auth.isLocalhost();
  }

  isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  logout(): void {
    this.auth.logout();
  }

  onRefresh(): void {
    if (this.onRefreshFn) this.onRefreshFn();
  }
}
