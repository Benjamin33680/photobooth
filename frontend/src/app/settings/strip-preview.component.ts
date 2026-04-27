import { Component, Input, OnChanges } from '@angular/core';
import { StripLayout } from './settings.service';

@Component({
  selector: 'app-strip-preview',
  template: `
    <div class="preview-root">
      <p class="preview-label">APERÇU DU STRIP</p>
      <div
        class="preview-strip"
        [style.background-color]="bgColor"
        [style.background-image]="bgImageUrl ? 'url(' + bgImageUrl + ')' : 'none'"
        [style.grid-template-columns]="gridCols"
        [style.grid-template-rows]="gridRows"
      >
        <div
          *ngFor="let cell of layout.cells"
          class="preview-cell"
          [class.logo-cell]="cell.type === 'logo'"
          [class.photo-cell]="cell.type === 'photo'"
          [class.empty-cell]="cell.type === 'empty'"
          [style.grid-column]="(cell.col + 1) + ' / span ' + cell.col_span"
          [style.grid-row]="(cell.row + 1) + ' / span ' + cell.row_span"
        >
          <!-- Logo -->
          <ng-container *ngIf="cell.type === 'logo'">
            <img
              *ngIf="cell.logo && cell.logo !== 'default'"
              [src]="getLogoUrl(cell.logo)"
              class="logo-img"
              alt="logo"
            />
            <ng-container *ngIf="!cell.logo || cell.logo === 'default'">
              <span class="cell-icon">✦</span>
              <span class="cell-label">PHOTO<br>BOOTH</span>
            </ng-container>
          </ng-container>

          <!-- Photo -->
          <ng-container *ngIf="cell.type === 'photo'">
            <span class="cell-icon">📷</span>
            <span class="cell-label">P{{ (cell.photo_index ?? 0) + 1 }}</span>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .preview-root {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .preview-label {
      font-size: 11px;
      letter-spacing: 4px;
      color: rgba(128,144,255,0.4);
      margin: 0;
    }

    .preview-strip {
      display: grid;
      gap: 4px;
      padding: 8px;
      width: 100%;
      aspect-ratio: 16 / 10;
      border: 1px solid rgba(128,144,255,0.15);
      background-size: cover;
      background-position: center;
    }

    .preview-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      overflow: hidden;
    }

    .preview-cell.logo-cell {
      background: rgba(128,144,255,0.08);
      border: 1px solid rgba(128,144,255,0.2);
    }

    .preview-cell.photo-cell {
      background: rgba(40,50,100,0.4);
      border: 2px solid rgba(255,255,255,0.2);
    }

    .preview-cell.empty-cell {
      background: rgba(20,20,30,0.2);
      border: 1px dashed rgba(128,144,255,0.1);
    }

    .cell-icon { font-size: 16px; }

    .cell-label {
      font-size: 10px;
      letter-spacing: 2px;
      color: rgba(200,210,255,0.6);
      text-align: center;
      line-height: 1.4;
    }

    .logo-img {
      max-width: 80%;
      max-height: 80%;
      object-fit: contain;
    }
  `],
})
export class StripPreviewComponent implements OnChanges {
  @Input() layout!: StripLayout;
  @Input() bgColor = '#1a1a2e';
  @Input() bgImageUrl: string | null = null;
  @Input() logoBaseUrl = '';

  gridCols = '';
  gridRows = '';

  ngOnChanges(): void {
    this.gridCols = `repeat(${this.layout.cols}, 1fr)`;
    this.gridRows = `repeat(${this.layout.rows}, 1fr)`;
  }

  getLogoUrl(logo: string): string {
    if (!logo || logo === 'default') return '';
    return `${this.logoBaseUrl}/logos/${logo}`;
  }
}