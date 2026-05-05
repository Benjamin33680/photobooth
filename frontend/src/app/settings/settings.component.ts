import { Component, OnInit } from '@angular/core';
import QRCode from 'qrcode';
import { SettingsService } from '../services/settings.service';
import { AuthService } from '../services/auth.service';
import { AppSettings } from '../models/app-settings.model';
import { StripLayout } from '../models/strip-layout.model';
import { ConfirmAction } from '../models/confirm-action.model';
import { ConfigService } from '../services/config.service';
import { ThemeService, Theme } from '../services/theme.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  settings: AppSettings | null = null;
  logos: string[] = ['default'];
  backgrounds: { filename: string; url: string }[] = [];
  confirmType: 'shutdown' | 'reset' | null = null;
  toastMsg: string | null = null;
  isDirty = false;
  showUnsavedConfirm = false;
  tunnelUrl: string | null = null;
  tunnelQrCode: string | null = null;
  currentTheme: Theme = 'indigo';

  unsavedActions: ConfirmAction[] = [
    { label: 'Annuler',               type: 'cancel',  action: () => this.unsavedCancel() },
    { label: 'Quitter',               type: 'warning', action: () => this.unsavedLeave() },
    { label: 'Sauvegarder et quitter',type: 'primary',  action: () => this.unsavedSaveAndLeave() },
  ];

  private initialSettings = '';
  private unsavedResolve: ((value: boolean) => void) | null = null;

  get exporting(): boolean {
    return this.settingsService.isExporting;
  }

  get storageQuotaGb(): number {
    return Math.round((this.settings?.storage_quota_mb ?? 1024) / 1024);
  }

  constructor(
    private settingsService: SettingsService,
    private auth: AuthService,
    public config: ConfigService,
    private themeService: ThemeService,
  ) { }

  ngOnInit(): void {
    this.currentTheme = this.themeService.current();
    this.settingsService.getSettings().subscribe(s => {
      this.settings = s;
      this.initialSettings = JSON.stringify(s);
    });
    this.settingsService.getLogos().subscribe(r => this.logos = r.logos);
    this.settingsService.getBackgrounds().subscribe(r => this.backgrounds = r.backgrounds);
    this.settingsService.getTunnelUrl().subscribe(r => {
      this.tunnelUrl = r.url;
      if (r.url) this.generateTunnelQrCode(r.url);
    });
  }

  async generateTunnelQrCode(url: string): Promise<void> {
    this.tunnelQrCode = await QRCode.toDataURL(url, {
      width: 160,
      margin: 2,
      color: this.qrColors(),
    });
  }

  private qrColors(): { dark: string; light: string } {
    const s = getComputedStyle(document.body);
    return {
      dark:  s.getPropertyValue('--ph-qr-dark').trim()  || '#e0e6ff',
      light: s.getPropertyValue('--ph-qr-light').trim() || '#0d0d1a',
    };
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.themeService.apply(theme);
  }

  copyTunnelUrl(): void {
    if (!this.tunnelUrl) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.tunnelUrl).then(() => this.showToast('URL copiée ✓'));
    } else {
      const el = document.createElement('textarea');
      el.value = this.tunnelUrl;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.showToast('URL copiée ✓');
    }
  }

  incrementQuota(): void {
    if (!this.settings || this.storageQuotaGb >= 20) return;
    this.settings.storage_quota_mb += 1024;
  }

  decrementQuota(): void {
    if (!this.settings || this.storageQuotaGb <= 1) return;
    this.settings.storage_quota_mb -= 1024;
  }

  save(): void {
    if (!this.settings) return;
    this.settingsService.saveSettings(this.settings).subscribe(() => {
      this.initialSettings = JSON.stringify(this.settings);
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
    if (!confirm('Supprimer ce fond ?')) return;
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

  confirmReset(): void    { this.confirmType = 'reset'; }
  confirmShutdown(): void { this.confirmType = 'shutdown'; }

  executeConfirm(): void {
    if (this.confirmType === 'reset') {
      this.settingsService.resetSettings().subscribe(s => {
        this.settings = s;
        this.confirmType = null;
        this.save();
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
    if (this.settings) this.settings.strip_layout = layout;
  }

  showUnsavedDialog(): Promise<boolean> {
    this.showUnsavedConfirm = true;
    return new Promise(resolve => { this.unsavedResolve = resolve; });
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
    return this.confirmType === 'shutdown'
      ? 'Éteindre le Raspberry Pi ?'
      : 'Remettre les réglages par défaut ?';
  }

  getConfirmMessage(): string {
    return this.confirmType === 'shutdown'
      ? "Le photobooth sera inaccessible jusqu'au prochain démarrage."
      : 'Tous vos réglages personnalisés seront perdus.';
  }

  getConfirmActions(): ConfirmAction[] {
    return [
      { label: 'Annuler',   type: 'cancel', action: () => this.confirmType = null },
      { label: 'Confirmer', type: 'danger',  action: () => this.executeConfirm() },
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
