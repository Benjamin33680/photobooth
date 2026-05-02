import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ArchivesService } from '../services/archives.service';
import { AuthService } from '../services/auth.service';
import { Archive } from '../models/archive.model';
import { ConfirmAction } from '../models/confirm-action.model';

@Component({
  selector: 'app-archives',
  templateUrl: './archives.component.html',
  styleUrl: './archives.component.scss',
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
