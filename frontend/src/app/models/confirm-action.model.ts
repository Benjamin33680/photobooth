export interface ConfirmAction {
  label: string;
  type: 'cancel' | 'danger' | 'warning' | 'primary';
  action: () => void;
}
