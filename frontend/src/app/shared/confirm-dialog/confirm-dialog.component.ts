import { Component, Input } from '@angular/core';

export interface ConfirmAction {
  label: string;
  type: 'cancel' | 'danger' | 'warning' | 'primary';
  action: () => void;
}

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() message = '';
  @Input() actions: ConfirmAction[] = [];
}
