import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ArchivesService, Archive } from './archives.service';
import { AuthService } from '../auth/auth.service';
import { ConfirmAction } from '../shared/confirm-dialog.component';

@Component({
  selector: 'app-archives',
  template: `
    <div class="archives-root">

      <!-- Header -->
      <app-header 
        title="ARCHIVES"
        [showSettings]="false"
        backLink="/settings"
      >
        <button class="archive-btn" (click)="showNameInput = true">
          + Archiver les photos
        </button>
      </app-header>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement...</p>
      </div>

      <!-- Empty -->
      <div *ngIf="!loading && archives.length === 0" class="empty-state">
        <span class="empty-icon">📦</span>
        <p>Aucune archive</p>
      </div>

      <!-- Liste -->
      <div class="archives-list" *ngIf="!loading && archives.length > 0">
        <div class="archive-item" *ngFor="let archive of archives">
          <div class="archive-info">
            <p class="archive-name">{{ archive.name }}</p>
            <p class="archive-meta">
              {{ formatDate(archive.created_at) }}
              <span class="sep">·</span>
              {{ archive.size_mb }} MB
            </p>
          </div>
          <div class="archive-actions">
            <button class="action-btn download" (click)="download(archive)" [disabled]="downloading === archive.filename">
              {{ downloading === archive.filename ? '...' : '↓' }}
            </button>
            <button class="action-btn danger" (click)="confirmDelete(archive)">✕</button>
          </div>
        </div>
      </div>

      <!-- Popup nom de l'archive -->
      <div class="confirm-overlay" *ngIf="showNameInput">
        <div class="confirm-box">
          <p class="confirm-msg">Nom de l'archive</p>
          <p class="confirm-sub">Ce nom sera utilisé pour identifier l'événement</p>
          <input
            class="archive-name-input"
            type="text"
            [(ngModel)]="archiveName"
            placeholder="Ex: Mariage_Julie_2026"
            (keyup.enter)="archiveName.trim() && showConfirmArchive()"
          />
          <div class="confirm-actions">
            <button class="confirm-btn cancel" (click)="showNameInput = false; archiveName = ''">Annuler</button>
            <button class="confirm-btn primary" (click)="showConfirmArchive()" [disabled]="!archiveName.trim()">Continuer</button>
          </div>
        </div>
      </div>

      <!-- Confirm dialog -->
      <app-confirm-dialog
        [visible]="confirmVisible"
        [title]="confirmTitle"
        [message]="confirmMessage"
        [actions]="confirmActions"
      ></app-confirm-dialog>

      <!-- Toast -->
      <div class="toast" *ngIf="toastMsg">{{ toastMsg }}</div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #07070f;
      color: #c0c8ff;
      font-family: 'Courier New', monospace;
      overflow-y: auto;
    }

    .header {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 20px 40px;
      background: rgba(7,7,15,0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(128,144,255,0.1);
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

    .title {
      flex: 1;
      margin: 0;
      font-size: 22px;
      font-weight: 400;
      letter-spacing: 8px;
      color: #e0e6ff;
    }

    .archive-btn {
      background: rgba(128,144,255,0.1);
      border: 1px solid rgba(128,144,255,0.4);
      color: #8090ff;
      padding: 10px 20px;
      font-size: 12px;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
    }
    .archive-btn:hover { background: rgba(128,144,255,0.2); }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      height: 60vh;
      color: rgba(128,144,255,0.5);
      letter-spacing: 3px;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 2px solid rgba(128,144,255,0.15);
      border-top-color: #8090ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Empty */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      height: 60vh;
      color: rgba(128,144,255,0.3);
    }
    .empty-icon { font-size: 64px; opacity: 0.4; }
    .empty-state p { font-size: 16px; letter-spacing: 3px; margin: 0; }

    /* Liste */
    .archives-list {
      padding: 24px 40px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .archive-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border: 1px solid rgba(128,144,255,0.1);
      transition: border-color 0.2s;
    }
    .archive-item:hover { border-color: rgba(128,144,255,0.25); }

    .archive-info { display: flex; flex-direction: column; gap: 6px; }

    .archive-name {
      font-size: 15px;
      letter-spacing: 2px;
      color: #e0e6ff;
      margin: 0;
    }

    .archive-meta {
      font-size: 12px;
      letter-spacing: 2px;
      color: rgba(128,144,255,0.4);
      margin: 0;
      display: flex;
      gap: 8px;
    }

    .sep { opacity: 0.4; }

    .archive-actions { display: flex; gap: 8px; }

    .action-btn {
      background: none;
      border: 1px solid rgba(128,144,255,0.2);
      color: rgba(128,144,255,0.6);
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }
    .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .action-btn.download:hover { border-color: #8090ff; color: #8090ff; }
    .action-btn.danger:hover { border-color: #ff6060; color: #ff6060; }

    /* Popup nom */
    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(5,5,16,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
    }

    .confirm-box {
      background: #0d0d1a;
      border: 1px solid rgba(128,144,255,0.2);
      padding: 48px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 450px;
      width: 90%;
      text-align: center;
    }

    .confirm-msg {
      font-size: 18px;
      letter-spacing: 3px;
      color: #e0e6ff;
      margin: 0;
    }

    .confirm-sub {
      font-size: 12px;
      letter-spacing: 2px;
      color: rgba(128,144,255,0.5);
      margin: 0;
      line-height: 1.6;
    }

    .archive-name-input {
      background: rgba(128,144,255,0.05);
      border: 1px solid rgba(128,144,255,0.2);
      color: #e0e6ff;
      padding: 14px 16px;
      font-size: 14px;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
      outline: none;
      width: 100%;
      transition: border-color 0.2s;
      text-align: center;
    }
    .archive-name-input:focus { border-color: #8090ff; }
    .archive-name-input::placeholder { color: rgba(128,144,255,0.3); }

    .confirm-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .confirm-btn {
      padding: 12px 20px;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
      background: none;
    }
    .confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .confirm-btn.cancel {
      border: 1px solid rgba(255,200,80,0.3);
      color: #ffc850;
    }
    .confirm-btn.cancel:hover { background: rgba(255,200,80,0.08); }
    .confirm-btn.primary {
      border: 1px solid rgba(128,144,255,0.4);
      color: #8090ff;
      background: rgba(128,144,255,0.1);
    }
    .confirm-btn.primary:hover { background: rgba(128,144,255,0.2); }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(128,144,255,0.2);
      border: 1px solid rgba(128,144,255,0.4);
      color: #c0c8ff;
      padding: 12px 32px;
      font-size: 13px;
      letter-spacing: 3px;
      z-index: 300;
    }

    @media (max-width: 600px) {
      .header { padding: 16px 20px; flex-wrap: wrap; gap: 12px; }
      .title { font-size: 16px; }
      .archives-list { padding: 16px 20px; }
    }
  `]
})
export class ArchivesComponent implements OnInit {
  archives: Archive[] = [];
  loading = true;
  downloading: string | null = null;
  showNameInput = false;
  archiveName = '';
  toastMsg: string | null = null;
  confirmVisible = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmActions: ConfirmAction[] = [];

  private archivesService = inject(ArchivesService);
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadArchives();
  }

  loadArchives(): void {
    this.loading = true;
    this.archivesService.getArchives().subscribe({
      next: (res) => {
        this.archives = res.archives;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  showConfirmArchive(): void {
    this.showNameInput = false;
    this.confirmTitle = 'Archiver et vider la galerie ?';
    this.confirmMessage = `Toutes les photos seront compressées dans "${this.archiveName}" et la galerie sera vidée.`;
    this.confirmActions = [
      { label: 'Annuler', type: 'cancel', action: () => this.confirmVisible = false },
      { label: 'Archiver', type: 'danger', action: () => this.doArchive() },
    ];
    this.confirmVisible = true;
  }

  doArchive(): void {
    this.confirmVisible = false;
    this.archivesService.createArchive(this.archiveName).subscribe({
      next: () => {
        this.archiveName = '';
        this.showToast('Archive créée ✓');
        this.loadArchives();
      },
      error: () => this.showToast('Erreur lors de l\'archivage')
    });
  }

  async download(archive: Archive): Promise<void> {
    const token = this.auth.getToken();
    if (!token) return;
    this.downloading = archive.filename;
    try {
      await this.archivesService.downloadArchive(archive.filename, token);
    } finally {
      this.downloading = null;
    }
  }

  confirmDelete(archive: Archive): void {
    this.confirmTitle = 'Supprimer cette archive ?';
    this.confirmMessage = `"${archive.name}" sera définitivement supprimée.`;
    this.confirmActions = [
      { label: 'Annuler', type: 'cancel', action: () => this.confirmVisible = false },
      { label: 'Supprimer', type: 'danger', action: () => this.doDelete(archive) },
    ];
    this.confirmVisible = true;
  }

  doDelete(archive: Archive): void {
    this.confirmVisible = false;
    this.archivesService.deleteArchive(archive.filename).subscribe({
      next: () => {
        this.archives = this.archives.filter(a => a.filename !== archive.filename);
        this.showToast('Archive supprimée ✓');
      },
      error: () => this.showToast('Erreur lors de la suppression')
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  showToast(msg: string): void {
    this.toastMsg = msg;
    setTimeout(() => this.toastMsg = null, 3000);
  }
}
