import { Component, Input } from '@angular/core';
import { ConfirmAction } from '../../models/confirm-action.model';

export { ConfirmAction };

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
