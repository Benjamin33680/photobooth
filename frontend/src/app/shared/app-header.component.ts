import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-header',
  template: `
    <header class="header">
      <h1 class="title">{{ title }}</h1>
      <div class="header-right">

        <!-- Slot custom (stats, etc.) -->
        <ng-content></ng-content>

        <!-- Bouton déclencher -->
        <a routerLink="/remote" class="icon-btn camera" *ngIf="!isLocalhost() && remoteEnabled && showRemote">
          <mat-icon>camera_alt</mat-icon>
        </a>

        <!-- Bouton settings -->
        <a routerLink="/settings" class="icon-btn" *ngIf="isAdmin() && showSettings">
          <mat-icon>settings</mat-icon>
        </a>

        <!-- Bouton refresh -->
        <button class="icon-btn" *ngIf="showRefresh && !isLocalhost()" (click)="onRefresh()">
          <mat-icon>refresh</mat-icon>
        </button>

        <!-- Bouton retour -->
        <a [routerLink]="backLink" class="icon-btn" *ngIf="backLink">
          <mat-icon>arrow_back</mat-icon>
        </a>

        <!-- Bouton logout -->
        <button class="icon-btn logout" *ngIf="!isLocalhost()" (click)="logout()">
          <mat-icon>logout</mat-icon>
        </button>

      </div>
    </header>
    <a routerLink="/" class="fab-camera" *ngIf="isLocalhost()" matTooltip="Retour au photobooth" matTooltipPosition="left">
      <mat-icon>camera_alt</mat-icon>
    </a>
  `,
  styles: [`
    .header {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      background: rgba(7,7,15,0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(128,144,255,0.1);
      font-family: 'Courier New', monospace;
    }

    .title {
      flex: 1;
      margin: 0;
      font-size: 22px;
      font-weight: 400;
      letter-spacing: 10px;
      color: #e0e6ff;
    }

    .back-link {
      color: rgba(128,144,255,0.6);
      text-decoration: none;
      font-size: 13px;
      letter-spacing: 2px;
      text-transform: uppercase;
      transition: color 0.2s;
    }
    .back-link:hover { color: #8090ff; }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .fab-camera {
      position: fixed;
      bottom: 60px;
      right: 60px;
      width: 10em;
      height: 10em;
      border-radius: 50%;
      color: white;
      background: #8090ff;
      display: flex;
      border: 5px solid white;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      z-index: 50;
    }
    
    .fab-camera mat-icon { 
      font-size: 60px;
      width: 60px;
      height: 60px;
    }

    @media (max-width: 600px) {
      .header { padding: 12px 16px; }
      .title { font-size: 16px; letter-spacing: 6px; }
    }
  `],
})
export class AppHeaderComponent implements OnInit {
  @Input() title = '';
  @Input() showRemote = true;
  @Input() showRefresh = false;
  @Input() showSettings = true;
  @Input() backLink: string | null = null;
  @Input() onRefreshFn: (() => void) | null = null;

  remoteEnabled = true;

  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit(): void {
    fetch(`http://${window.location.hostname}:8000/api/settings`)
      .then(r => r.json())
      .then(cfg => { this.remoteEnabled = cfg.remote_enabled ?? true; });
  }

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

