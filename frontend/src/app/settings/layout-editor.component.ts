import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
} from '@angular/core';
import { Cell, StripLayout } from './settings.service';

@Component({
  selector: 'app-layout-editor',
  template: `
    <div class="editor-root">

      <!-- Choix du format -->
      <div class="format-selector">
        <p class="section-label">FORMAT</p>
        <div class="format-options">
          <div
            *ngFor="let f of formats"
            class="format-option"
            [class.selected]="layout.cols === f.cols"
            (click)="setFormat(f.cols)"
          >
            <div class="format-grid" [style.grid-template-columns]="'repeat(' + f.cols + ', 1fr)'">
              <div *ngFor="let c of getRange(f.cols * f.cols)" class="format-cell"></div>
            </div>
            <span>{{ f.label }}</span>
          </div>
        </div>
      </div>

      <!-- Éditeur de cellules -->
      <div class="editor-body">
        <div class="grid-section">
          <p class="section-label">DISPOSITION</p>
          <div
            class="layout-grid"
            [style.grid-template-columns]="'repeat(' + layout.cols + ', 1fr)'"
          >
            <div
              *ngFor="let cell of layout.cells; let i = index"
              class="layout-cell"
              [class.logo-cell]="cell.type === 'logo'"
              [class.photo-cell]="cell.type === 'photo'"
              [class.empty-cell]="cell.type === 'empty'"
              [class.selected]="selectedIndex === i"
              draggable="true"
              (dragstart)="onDragStart(i)"
              (dragover)="$event.preventDefault()"
              (drop)="onDrop(i)"
              (click)="selectCell(i)"
            >
              <span *ngIf="cell.type === 'logo'">✦</span>
              <span *ngIf="cell.type === 'photo'">📷 P{{ (cell.photo_index ?? 0) + 1 }}</span>
              <span *ngIf="cell.type === 'empty'">—</span>
            </div>
          </div>
        </div>

        <!-- Panel cellule sélectionnée -->
        <div class="cell-panel" *ngIf="selectedCell">
          <p class="section-label">CELLULE {{ (selectedIndex ?? 0) + 1 }}</p>

          <div class="panel-group">
            <label>Type</label>
            <div class="type-options">
              <button
                *ngFor="let t of typeOptions"
                class="type-btn"
                [class.active]="selectedCell.type === t"
                (click)="selectedCell.type = asType(t); onTypeChange()"
              >{{ t }}</button>
            </div>
          </div>

          <div class="panel-group" *ngIf="selectedCell.type === 'logo'">
            <label>Logo</label>
            <div class="type-options logo-list">
              <button
                *ngFor="let logo of logos"
                class="type-btn"
                [class.active]="selectedCell.logo === logo"
                (click)="selectedCell.logo = logo; emit()"
              >{{ logo === 'default' ? 'Défaut' : logo }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Erreur -->
      <div class="error-msg" *ngIf="errorMsg">⚠ {{ errorMsg }}</div>

    </div>
  `,
  styles: [`
    .editor-root {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .section-label {
      font-size: 11px;
      letter-spacing: 4px;
      color: rgba(128,144,255,0.4);
      margin: 0 0 12px;
    }

    /* Format selector */
    .format-options {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .format-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 16px;
      border: 2px solid rgba(128,144,255,0.15);
      cursor: pointer;
      transition: all 0.2s;
      min-width: 100px;
    }
    .format-option:hover { border-color: rgba(128,144,255,0.4); }
    .format-option.selected { border-color: #8090ff; background: rgba(128,144,255,0.08); }

    .format-grid {
      display: grid;
      gap: 3px;
      width: 60px;
      height: 60px;
    }

    .format-cell {
      background: rgba(128,144,255,0.2);
      border: 1px solid rgba(128,144,255,0.3);
    }

    .format-option span {
      font-size: 12px;
      letter-spacing: 3px;
      color: rgba(128,144,255,0.7);
    }

    /* Editor body */
    .editor-body {
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 24px;
    }

    .layout-grid {
      display: grid;
      gap: 6px;
      background: rgba(128,144,255,0.03);
      border: 1px solid rgba(128,144,255,0.1);
      padding: 12px;
    }

    .layout-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(128,144,255,0.15);
      font-size: 12px;
      letter-spacing: 2px;
      cursor: pointer;
      transition: all 0.2s;
      height: 80px;
    }
    .layout-cell:hover { border-color: rgba(128,144,255,0.4); }
    .layout-cell.selected { border-color: #8090ff; }
    .layout-cell.logo-cell { background: rgba(128,144,255,0.08); color: #8090ff; }
    .layout-cell.photo-cell { background: rgba(30,40,80,0.4); color: #c0c8ff; }
    .layout-cell.empty-cell { background: rgba(20,20,30,0.3); color: rgba(128,144,255,0.2); }

    /* Cell panel */
    .cell-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px;
      border: 1px solid rgba(128,144,255,0.1);
      background: rgba(128,144,255,0.02);
      align-self: start;
    }

    .panel-group select {
      background: #0d0d1a;
      border: 1px solid rgba(128,144,255,0.2);
      color: #e0e6ff;
      padding: 10px 12px;
      font-size: 13px;
      font-family: 'Courier New', monospace;
      cursor: pointer;
      width: 100%;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238090ff' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 36px;
    }

    .panel-group select option {
      background: #0d0d1a;
      color: #e0e6ff;
    }

    .panel-group select:focus {
      outline: none;
      border-color: #8090ff;
    }

    .panel-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .panel-group label {
      font-size: 11px;
      letter-spacing: 3px;
      color: rgba(128,144,255,0.5);
      text-transform: uppercase;
    }

    .panel-group select {
      background: rgba(128,144,255,0.05);
      border: 1px solid rgba(128,144,255,0.2);
      color: #e0e6ff;
      padding: 10px 12px;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
    }

    .type-options {
      display: flex;
      flex-direction: column !important;
      gap: 8px;
    }

    .logo-list {
      max-height: 100px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .logo-list::-webkit-scrollbar { width: 4px; }
    .logo-list::-webkit-scrollbar-track { background: #07070f; }
    .logo-list::-webkit-scrollbar-thumb { background: rgba(128,144,255,0.3); border-radius: 2px; }

    .type-btn {
      background: none;
      border: 1px solid rgba(128,144,255,0.2);
      color: rgba(128,144,255,0.6);
      padding: 8px 16px;
      font-size: 12px;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-family: 'Courier New', monospace;
      cursor: pointer;
      transition: all 0.2s;
    }
    .type-btn:hover { border-color: rgba(128,144,255,0.5); color: #8090ff; }
    .type-btn.active { border-color: #8090ff; background: rgba(128,144,255,0.1); color: #8090ff; }

    .error-msg {
      padding: 12px 16px;
      border: 1px solid rgba(255,96,96,0.3);
      color: #ff6060;
      font-size: 12px;
      letter-spacing: 2px;
    }

    @media (max-width: 700px) {
      .editor-body { grid-template-columns: 1fr; }
    }
  `],
})
export class LayoutEditorComponent implements OnChanges {
  @Input() layout!: StripLayout;
  @Input() logos: string[] = ['default'];
  @Output() layoutChange = new EventEmitter<StripLayout>();

  selectedIndex: number | null = null;
  dragIndex: number | null = null;
  errorMsg: string | null = null;

  typeOptions = ['logo', 'photo', 'empty'];

  formats = [
    { cols: 1, label: '1×1' },
    { cols: 2, label: '2×2' },
    { cols: 3, label: '3×3' },
  ];

  get selectedCell(): Cell | null {
    if (this.selectedIndex === null) return null;
    return this.layout.cells[this.selectedIndex] ?? null;
  }

  get photoCount(): number {
    return this.layout.cells.filter(c => c.type === 'photo').length;
  }

  ngOnChanges(): void {
    this.selectedIndex = null;
  }

  getRange(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  asType(t: string): 'logo' | 'photo' | 'empty' {
    return t as 'logo' | 'photo' | 'empty';
  }

  setFormat(cols: number): void {
    if (cols === this.layout.cols) return;

    // Grille vierge — toutes les cellules en vide
    const newCells: Cell[] = [];
    for (let r = 0; r < cols; r++) {
      for (let c = 0; c < cols; c++) {
        newCells.push({
          id: Date.now() + r * cols + c,
          type: 'empty',
          col: c,
          row: r,
          col_span: 1,
          row_span: 1,
        });
      }
    }

    this.layout.cols = cols;
    this.layout.rows = cols;
    this.layout.cells = newCells;
    this.selectedIndex = null;
    this.emit();
  }

  selectCell(index: number): void {
    this.selectedIndex = this.selectedIndex === index ? null : index;
  }

  onTypeChange(): void {
    if (!this.selectedCell) return;
    if (this.selectedCell.type === 'logo') {
      this.selectedCell.logo = 'default';
      delete this.selectedCell.photo_index;
      this.reindexPhotos();
    } else if (this.selectedCell.type === 'photo') {
      // Nouvelle photo = max + 1
      this.selectedCell.photo_index = this.photoCount - 1;
      delete this.selectedCell.logo;
    } else {
      // Vide
      delete this.selectedCell.photo_index;
      delete this.selectedCell.logo;
      this.reindexPhotos();
    }
    this.emit();
  }

  onDragStart(index: number): void {
    this.dragIndex = index;
  }

  onDrop(targetIndex: number): void {
    if (this.dragIndex === null) return;
    const cells = [...this.layout.cells];

    const dragType = cells[this.dragIndex].type;
    const targetType = cells[targetIndex].type;

    if (dragType === 'photo' && targetType === 'photo') {
      // Inverse uniquement les numéros de photo
      const tempIndex = cells[this.dragIndex].photo_index;
      cells[this.dragIndex].photo_index = cells[targetIndex].photo_index;
      cells[targetIndex].photo_index = tempIndex;
    } else {
      // Échange type et contenu
      const tempType = cells[this.dragIndex].type;
      const tempLogo = cells[this.dragIndex].logo;
      const tempPhotoIndex = cells[this.dragIndex].photo_index;

      cells[this.dragIndex].type = cells[targetIndex].type;
      cells[this.dragIndex].logo = cells[targetIndex].logo;
      cells[this.dragIndex].photo_index = cells[targetIndex].photo_index;

      cells[targetIndex].type = tempType;
      cells[targetIndex].logo = tempLogo;
      cells[targetIndex].photo_index = tempPhotoIndex;

      // Renumérotation seulement si pas photo↔photo
      this.layout.cells = cells;
      this.dragIndex = null;
      this.reindexPhotos();
      this.emit();
      return;
    }

    this.layout.cells = cells;
    this.dragIndex = null;
    this.emit();
  }

  emit(): void {
    this.layoutChange.emit({ ...this.layout, cells: [...this.layout.cells] });
  }

  private reindexPhotos(): void {
    let index = 0;
    for (const cell of this.layout.cells) {
      if (cell.type === 'photo') {
        cell.photo_index = index++;
      }
    }
  }
}