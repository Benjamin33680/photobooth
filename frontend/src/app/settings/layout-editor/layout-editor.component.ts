import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
} from '@angular/core';
import { Cell } from '../../models/cell.model';
import { StripLayout } from '../../models/strip-layout.model';

@Component({
  selector: 'app-layout-editor',
  templateUrl: './layout-editor.component.html',
  styleUrl: './layout-editor.component.scss',
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
      this.selectedCell.photo_index = this.photoCount - 1;
      delete this.selectedCell.logo;
    } else {
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
    const dragType   = cells[this.dragIndex].type;
    const targetType = cells[targetIndex].type;

    if (dragType === 'photo' && targetType === 'photo') {
      const tempIndex = cells[this.dragIndex].photo_index;
      cells[this.dragIndex].photo_index = cells[targetIndex].photo_index;
      cells[targetIndex].photo_index = tempIndex;
    } else {
      const tempType       = cells[this.dragIndex].type;
      const tempLogo       = cells[this.dragIndex].logo;
      const tempPhotoIndex = cells[this.dragIndex].photo_index;
      cells[this.dragIndex].type        = cells[targetIndex].type;
      cells[this.dragIndex].logo        = cells[targetIndex].logo;
      cells[this.dragIndex].photo_index = cells[targetIndex].photo_index;
      cells[targetIndex].type        = tempType;
      cells[targetIndex].logo        = tempLogo;
      cells[targetIndex].photo_index = tempPhotoIndex;
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
      if (cell.type === 'photo') cell.photo_index = index++;
    }
  }
}
