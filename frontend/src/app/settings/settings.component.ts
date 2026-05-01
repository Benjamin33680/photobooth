import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsService, AppSettings, Cell, StripLayout } from './settings.service';
import { AuthService } from '../auth/auth.service';
import { ConfirmAction } from '../shared/confirm-dialog.component';
import { ConfigService } from '../shared/config.service';

@Component({
  selector: 'app-settings',
  template: `
    <div class="settings-root">

      <!-- Header -->
      <app-header
        title="RÉGLAGES"
        [showRemote]="false"
        [showSettings]="false"
        backLink="/gallery"
      >
        <button class="icon-btn save" (click)="save()"><mat-icon>save</mat-icon></button>
      </app-header>

      <div class="content" *ngIf="settings">

        <!-- Section Toggle -->
        <section class="section">
          <h2 class="section-title">Affichage</h2>
          <div class="toggles">
            <label class="toggle-row">
              <span>Afficher le QR code</span>
              <input type="checkbox" [(ngModel)]="settings.show_qrcode" />
            </label>
            <label class="toggle-row">
              <span>Photo à distance</span>
              <input type="checkbox" [(ngModel)]="settings.remote_enabled" />
            </label>
          </div>
        </section>

        <!-- Section Logo -->
        <section class="section">
          <h2 class="section-title">Logo</h2>
          <div class="logo-grid">
            <div
              *ngFor="let logo of logos"
              class="logo-item"
            >
              <div *ngIf="logo === 'default'" class="logo-default">
                <span>✦</span>
                <p>PHOTO<br>BOOTH</p>
              </div>
              <img *ngIf="logo !== 'default'" [src]="getLogoUrl(logo)" [alt]="logo" />
              <p class="logo-name">{{ logo === 'default' ? 'Défaut' : logo }}</p>
              <button
                *ngIf="logo !== 'default'"
                class="delete-media-btn"
                (click)="deleteLogo(logo)"
                matTooltip="Supprimer"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </div>
            <!-- Bouton + à la fin -->
            <label class="logo-item add-item" matTooltip="Ajouter un logo">
              <mat-icon>add</mat-icon>
              <input type="file" accept="image/*" (change)="uploadLogo($event)" hidden />
            </label>
          </div>
        </section>

        <!-- Section Fond -->
        <section class="section">
          <h2 class="section-title">Fond du strip</h2>
          <div class="bg-options">
            <div class="bg-color">
              <label>Couleur de fond</label>
              <input type="color" [(ngModel)]="settings.strip_background" />
              <span class="color-value">{{ settings.strip_background }}</span>
            </div>
            <div class="bg-image">
              <label>Image de fond</label>
              <div class="bg-previews">
                <div
                  class="bg-item"
                  [class.selected]="settings.strip_background_image === null"
                  (click)="settings.strip_background_image = null"
                >
                  <div class="bg-none">Aucune</div>
                </div>
                <div
                  *ngFor="let bg of backgrounds"
                  class="bg-item"
                  [class.selected]="settings.strip_background_image === bg.filename"
                  (click)="settings.strip_background_image = bg.filename"
                >
                  <img [src]="getBgUrl(bg.filename)" [alt]="bg.filename" />
                  <button
                    class="delete-media-btn"
                    (click)="deleteBackground($event, bg.filename)"
                    matTooltip="Supprimer"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
                <!-- Bouton + à la fin -->
                <label class="bg-item add-item" matTooltip="Ajouter un fond">
                  <mat-icon>add</mat-icon>
                  <input type="file" accept="image/*" (change)="uploadBackground($event)" hidden />
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- Section Layout drag & drop -->
        <section class="section">
          <h2 class="section-title">Disposition du strip</h2>

          <!-- Éditeur -->
          <app-layout-editor
            *ngIf="settings"
            [layout]="settings.strip_layout"
            [logos]="logos"
            (layoutChange)="onLayoutChange($event)"
          ></app-layout-editor>

          <!-- Preview temps réel -->
          <app-strip-preview
            *ngIf="settings"
            [layout]="settings.strip_layout"
            [bgColor]="settings.strip_background"
            [bgImageUrl]="settings.strip_background_image ? getBgUrl(settings.strip_background_image) : null"
            [logoBaseUrl]="config.apiUrl"
          ></app-strip-preview>
        </section>

        <div class="panel-group">
          <label>Espace alloué aux photos (MB)</label>
          <input
            type="number"
            class="input-number"
            [(ngModel)]="settings.storage_quota_mb"
            min="100"
            step="100"
          />
        </div>

        <!-- Section Actions -->
        <section class="section">
          <h2 class="section-title">Actions</h2>
          <div class="actions-grid">
            <button class="action-btn export" (click)="exportPhotos()" [disabled]="exporting">
              {{ exporting ? '⏳ Génération du ZIP...' : '↓ Télécharger toutes les photos (ZIP)' }}
            </button>
            <button class="action-btn reset" (click)="confirmReset()">
              ↺ Réinitialiser les réglages
            </button>
            <a routerLink="/archives" class="action-btn archives">
              📦 Gérer les archives
            </a>
            <button class="action-btn shutdown" (click)="confirmShutdown()">
              ⏻ Éteindre le Pi
            </button>
          </div>
        </section>

      </div>

      <!-- Popup reset/shutdown -->
      <app-confirm-dialog
        [visible]="confirmType !== null"
        [title]="getConfirmTitle()"
        [message]="getConfirmMessage()"
        [actions]="getConfirmActions()"
      ></app-confirm-dialog>

      <!-- Popup unsaved -->
      <app-confirm-dialog
        [visible]="showUnsavedConfirm"
        title="Modifications non sauvegardées"
        message="Voulez-vous sauvegarder avant de quitter ?"
        [actions]="unsavedActions"
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
      // padding-bottom:3em;
    }

    .content {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 24px;
      display: flex;
      flex-direction: column;
      gap: 48px;
    }

    .section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .section-title {
      font-size: 13px;
      letter-spacing: 5px;
      text-transform: uppercase;
      color: rgba(128,144,255,0.6);
      margin: 0;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(128,144,255,0.1);
    }

    .logo-item {
      position: relative;
    }

    .bg-item {
      position: relative;
    }

    .delete-media-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      background: rgba(255,96,96,0.15);
      border: 1px solid rgba(255,96,96,0.3);
      border-radius: 50%;
      color: #ff6060;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
      padding: 0;
    }

    .logo-item:hover .delete-media-btn,
    .bg-item:hover .delete-media-btn {
      opacity: 1;
    }

    .delete-media-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .add-item {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed rgba(128,144,255,0.3) !important;
      color: rgba(128,144,255,0.5);
      cursor: pointer;
      transition: all 0.2s;
      background: none;
    }
    .add-item:hover {
      border-color: #8090ff !important;
      color: #8090ff;
    }
    .add-item mat-icon { font-size: 24px; }

    .input-number {
      background: rgba(128, 144, 255, 0.05);
      border: 1px solid rgba(128, 144, 255, 0.2);
      color: #e0e6ff;
      padding: 10px 12px;
      font-size: 13px;
      font-family: 'Courier New', monospace;
      width: 100%;
    }
    .input-number:focus { outline: none; border-color: #8090ff; }

    /* Toggles */
    .toggles { display: flex; flex-direction: column; gap: 16px; }
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border: 1px solid rgba(128,144,255,0.1);
      cursor: pointer;
      font-size: 14px;
      letter-spacing: 2px;
    }
    .toggle-row input[type="checkbox"] {
      width: 20px;
      height: 20px;
      accent-color: #8090ff;
      cursor: pointer;
    }

    /* Logo grid */
    .logo-grid {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .logo-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border: 2px solid rgba(128,144,255,0.1);
      cursor: pointer;
      transition: all 0.2s;
      width: 120px;
    }
    .logo-item.selected { border-color: #8090ff; background: rgba(128,144,255,0.1); }
    .logo-item img { width: 80px; height: 80px; object-fit: contain; }
    .logo-name { font-size: 11px; letter-spacing: 2px; color: rgba(128,144,255,0.5); margin: 0; }

    .logo-default {
      width: 80px;
      height: 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #8090ff;
      font-size: 12px;
      letter-spacing: 2px;
    }
    .logo-default span { font-size: 24px; }
    .logo-default p { margin: 4px 0 0; text-align: center; line-height: 1.4; }

    /* Background */
    .bg-options { display: flex; flex-direction: column; gap: 24px; }
    .bg-color {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 14px;
      letter-spacing: 2px;
    }
    .bg-color input[type="color"] {
      width: 60px;
      height: 40px;
      border: 1px solid rgba(128,144,255,0.3);
      background: none;
      cursor: pointer;
      padding: 2px;
    }
    .color-value { color: rgba(128,144,255,0.5); font-size: 12px; }

    .bg-image { display: flex; flex-direction: column; gap: 16px; }
    .bg-image label { font-size: 14px; letter-spacing: 2px; }
    .bg-previews { display: flex; gap: 12px; flex-wrap: wrap; }
    .bg-item {
      width: 120px;
      height: 80px;
      border: 2px solid rgba(128,144,255,0.1);
      cursor: pointer;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .bg-item.selected { border-color: #8090ff; }
    .bg-item img { width: 100%; height: 100%; object-fit: cover; }
    .bg-none {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      letter-spacing: 2px;
      color: rgba(128,144,255,0.4);
    }

    /* Actions */
    .actions-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .action-btn {
      padding: 16px 24px;
      font-size: 13px;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      background: none;
    }

    .action-btn.export {
      border: 1px solid rgba(128,144,255,0.3);
      color: #8090ff;
    }
    .action-btn.export:hover { background: rgba(128,144,255,0.1); }

    .action-btn.reset {
      border: 1px solid rgba(255,200,80,0.3);
      color: #ffc850;
    }
    .action-btn.reset:hover { background: rgba(255,200,80,0.08); }

    .action-btn.shutdown {
      border: 1px solid rgba(255,96,96,0.3);
      color: #ff6060;
    }
    .action-btn.shutdown:hover { background: rgba(255,96,96,0.08); }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

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
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

    .action-btn.archives {
      border: 1px solid rgba(128,144,255,0.3);
      color: #8090ff;
      text-decoration: none;
    }
       
.action-btn.archives:hover { background: rgba(128,144,255,0.08); }

    @media (max-width: 600px) {
      .content { padding: 24px 16px; }
    }
  `],
})
export class SettingsComponent implements OnInit {
  settings: AppSettings | null = null;
  logos: string[] = ['default'];
  backgrounds: { filename: string; url: string }[] = [];
  confirmType: 'shutdown' | 'reset' | null = null;
  toastMsg: string | null = null;
  isDirty = false;
  showUnsavedConfirm = false;

  unsavedActions: ConfirmAction[] = [
    { label: 'Annuler', type: 'cancel', action: () => this.unsavedCancel() },
    { label: 'Quitter', type: 'warning', action: () => this.unsavedLeave() },
    { label: 'Sauvegarder et quitter', type: 'primary', action: () => this.unsavedSaveAndLeave() },
  ];

  private initialSettings: string = '';
  private unsavedResolve: ((value: boolean) => void) | null = null;

  get exporting(): boolean {
    return this.settingsService.isExporting;
  }

  constructor(
    private settingsService: SettingsService,
    private auth: AuthService,
    public config: ConfigService
  ) { }

  ngOnInit(): void {
    this.settingsService.getSettings().subscribe(s => this.settings = s);
    this.settingsService.getLogos().subscribe(r => this.logos = r.logos);
    this.settingsService.getBackgrounds().subscribe(r => this.backgrounds = r.backgrounds);
    this.settingsService.getSettings().subscribe(s => {
      this.settings = s;
      this.initialSettings = JSON.stringify(s); // Sauvegarde l'état initial
    });
  }

  save(): void {
    if (!this.settings) return;
    this.settingsService.saveSettings(this.settings).subscribe(() => {
      this.initialSettings = JSON.stringify(this.settings); // Reset après save
      this.showToast('Réglages sauvegardés ✓');
    });
  }

  getLogoUrl(logo: string): string {
    return this.settingsService.getLogoUrl(logo);
  }

  getBgUrl(filename: string): string {
    return this.settingsService.getBackgroundUrl(filename);
  }

  uploadLogo(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.settingsService.uploadLogo(file).subscribe(() => {
      this.settingsService.getLogos().subscribe(r => this.logos = r.logos);
      this.showToast('Logo importé ✓');
    });
  }

  uploadBackground(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.settingsService.uploadBackground(file).subscribe(() => {
      this.settingsService.getBackgrounds().subscribe(r => this.backgrounds = r.backgrounds);
      this.showToast('Fond importé ✓');
    });
  }

  deleteLogo(filename: string): void {
    if (!confirm(`Supprimer le logo "${filename}" ?`)) return;
    this.settingsService.deleteLogo(filename).subscribe(() => {
      this.logos = this.logos.filter(l => l !== filename);
      this.showToast('Logo supprimé ✓');
    });
  }

  deleteBackground(event: Event, filename: string): void {
    event.stopPropagation();
    if (!confirm(`Supprimer ce fond ?`)) return;
    this.settingsService.deleteBackground(filename).subscribe(() => {
      this.backgrounds = this.backgrounds.filter(b => b.filename !== filename);
      if (this.settings?.strip_background_image === filename) {
        this.settings.strip_background_image = null;
      }
      this.showToast('Fond supprimé ✓');
    });
  }

  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.settings) !== this.initialSettings;
  }

  async exportPhotos(): Promise<void> {
    const token = this.auth.getToken();
    if (!token) return;
    this.settingsService.isExporting = true;
    try {
      await this.settingsService.exportPhotos(token);
    } finally {
      this.settingsService.isExporting = false;
    }
  }

  confirmReset(): void {
    this.confirmType = 'reset';
  }

  confirmShutdown(): void {
    this.confirmType = 'shutdown';
  }

  executeConfirm(): void {
    if (this.confirmType === 'reset') {
      this.settingsService.resetSettings().subscribe(s => {
        this.settings = s;
        this.confirmType = null;
        this.showToast('Réglages réinitialisés ✓');
      });
    } else if (this.confirmType === 'shutdown') {
      this.settingsService.shutdown().subscribe(() => {
        this.confirmType = null;
        this.showToast('Arrêt en cours...');
      });
    }
  }

  showToast(msg: string): void {
    this.toastMsg = msg;
    setTimeout(() => this.toastMsg = null, 3000);
  }

  onLayoutChange(layout: StripLayout): void {
    if (this.settings) {
      this.settings.strip_layout = layout;
    }
  }

  showUnsavedDialog(): Promise<boolean> {
    this.showUnsavedConfirm = true;
    return new Promise(resolve => {
      this.unsavedResolve = resolve;
    });
  }

  unsavedCancel(): void {
    this.showUnsavedConfirm = false;
    if (this.unsavedResolve) this.unsavedResolve(false);
  }

  unsavedLeave(): void {
    this.showUnsavedConfirm = false;
    if (this.unsavedResolve) this.unsavedResolve(true);
  }

  getConfirmTitle(): string {
    return this.confirmType === 'shutdown' ? 'Éteindre le Raspberry Pi ?' : 'Remettre les réglages par défaut ?';
  }

  getConfirmMessage(): string {
    return this.confirmType === 'shutdown'
      ? 'Le photobooth sera inaccessible jusqu\'au prochain démarrage.'
      : 'Tous vos réglages personnalisés seront perdus.';
  }

  getConfirmActions(): ConfirmAction[] {
    return [
      { label: 'Annuler', type: 'cancel', action: () => this.confirmType = null },
      { label: 'Confirmer', type: 'danger', action: () => this.executeConfirm() },
    ];
  }

  async unsavedSaveAndLeave(): Promise<void> {
    await this.saveAsync();
    this.showUnsavedConfirm = false;
    if (this.unsavedResolve) this.unsavedResolve(true);
  }

  private saveAsync(): Promise<void> {
    return new Promise(resolve => {
      if (!this.settings) { resolve(); return; }
      this.settingsService.saveSettings(this.settings).subscribe(() => {
        this.initialSettings = JSON.stringify(this.settings);
        this.showToast('Réglages sauvegardés ✓');
        resolve();
      });
    });
  }
}
