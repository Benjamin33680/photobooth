import { Component, Input, OnChanges } from '@angular/core';
import { StripLayout } from '../../models/strip-layout.model';

@Component({
  selector: 'app-strip-preview',
  templateUrl: './strip-preview.component.html',
  styleUrl: './strip-preview.component.scss',
})
export class StripPreviewComponent implements OnChanges {
  @Input() layout!: StripLayout;
  @Input() bgColor = '';
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
