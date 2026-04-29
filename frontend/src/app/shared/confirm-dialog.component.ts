import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface ConfirmAction {
  label: string;
  type: 'cancel' | 'danger' | 'warning' | 'primary';
  action: () => void;
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="confirm-overlay" *ngIf="visible">
      <div class="confirm-box">
        <p class="confirm-msg">{{ title }}</p>
        <p class="confirm-sub" *ngIf="message">{{ message }}</p>
        <div class="confirm-actions">
          <button
            *ngFor="let btn of actions"
            class="confirm-btn"
            [class.cancel]="btn.type === 'cancel'"
            [class.danger]="btn.type === 'danger'"
            [class.warning]="btn.type === 'warning'"
            [class.primary]="btn.type === 'primary'"
            (click)="btn.action()"
          >{{ btn.label }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(5, 5, 16, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
    }

    .confirm-box {
      background: #0d0d1a;
      border: 1px solid rgba(128, 144, 255, 0.2);
      padding: 48px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 450px;
      width: 90%;
      text-align: center;
    }

    .confirm-msg {
      font-size: 18px;
      letter-spacing: 3px;
      color: #e0e6ff;
      margin: 0;
      font-family: 'Courier New', monospace;
    }

    .confirm-sub {
      font-size: 12px;
      letter-spacing: 2px;
      color: rgba(128, 144, 255, 0.5);
      margin: 0;
      line-height: 1.6;
      font-family: 'Courier New', monospace;
    }

    .confirm-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
      margin-top: 16px;
    }

    .confirm-btn {
      padding: 12px 2px;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-family: 'Courier New', monospace;
      cursor: pointer;
      transition: all 0.2s;
      flex: 1;
      min-width: 100px;
      background: none;
    }

    .confirm-btn.cancel {
      border: 1px solid rgba(255, 200, 80, 0.4);
      color: #ffc850;
    }
    .confirm-btn.cancel:hover { background: rgba(255, 200, 80, 0.08); }

    .confirm-btn.danger {
      border: 1px solid rgba(255, 96, 96, 0.4);
      color: #ff6060;
      background: rgba(255, 96, 96, 0.1);
    }
    .confirm-btn.danger:hover { background: rgba(255, 96, 96, 0.2); }

    .confirm-btn.warning {
      border: 1px solid rgba(255, 96, 96, 0.4);
      color: #ff6060;
      background: rgba(255, 96, 96, 0.1);
    }
    .confirm-btn.warning:hover { background: rgba(255, 96, 96, 0.2); }

    .confirm-btn.primary {
      border: 1px solid rgba(80, 200, 120, 0.4);
      color: #50c878;
      background: rgba(80, 200, 120, 0.1);
    }
    .confirm-btn.primary:hover { background: rgba(80, 200, 120, 0.2); }

    .confirm-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 16px;
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() message = '';
  @Input() actions: ConfirmAction[] = [];
}
