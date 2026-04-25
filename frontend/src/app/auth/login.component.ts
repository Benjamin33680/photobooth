import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-root">
      <div class="login-box">
        <h1 class="title">✦ PHOTOBOOTH ✦</h1>
        <p class="subtitle">Connexion requise</p>

        <div class="form">
          <input
            class="input"
            type="text"
            placeholder="Identifiant"
            [(ngModel)]="username"
            (keyup.enter)="login()"
          />
          <input
            class="input"
            type="password"
            placeholder="Mot de passe"
            [(ngModel)]="password"
            (keyup.enter)="login()"
          />
          <button class="btn" (click)="login()" [disabled]="loading">
            {{ loading ? 'Connexion...' : 'Se connecter' }}
          </button>
          <p class="error" *ngIf="error">{{ error }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-root {
      width: 100vw;
      height: 100vh;
      background: #050510;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Courier New', monospace;
    }
    .login-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32px;
      padding: 60px 40px;
      border: 1px solid rgba(128, 144, 255, 0.2);
      min-width: 340px;
    }
    .title {
      font-size: 24px;
      letter-spacing: 8px;
      color: #e0e6ff;
      font-weight: 400;
      margin: 0;
    }
    .subtitle {
      font-size: 13px;
      letter-spacing: 3px;
      color: rgba(128, 144, 255, 0.5);
      margin: 0;
      text-transform: uppercase;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    }
    .input {
      background: rgba(128, 144, 255, 0.05);
      border: 1px solid rgba(128, 144, 255, 0.2);
      color: #e0e6ff;
      padding: 14px 16px;
      font-size: 14px;
      font-family: inherit;
      letter-spacing: 2px;
      outline: none;
      width: 100%;
      transition: border-color 0.2s;
    }
    .input:focus { border-color: #8090ff; }
    .input::placeholder { color: rgba(128, 144, 255, 0.3); }
    .btn {
      background: rgba(128, 144, 255, 0.1);
      border: 1px solid rgba(128, 144, 255, 0.4);
      color: #8090ff;
      padding: 14px;
      font-size: 13px;
      letter-spacing: 4px;
      text-transform: uppercase;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:hover { background: rgba(128, 144, 255, 0.2); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .error {
      color: #ff6060;
      font-size: 12px;
      letter-spacing: 2px;
      text-align: center;
      margin: 0;
    }
  `],
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  login(): void {
    if (!this.username || !this.password) return;
    this.loading = true;
    this.error = '';

    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/gallery']);
      },
      error: () => {
        this.loading = false;
        this.error = 'Identifiants incorrects';
      },
    });
  }
}
