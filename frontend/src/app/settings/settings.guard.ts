import { CanDeactivateFn } from '@angular/router';
import { SettingsComponent } from './settings.component';

export const settingsGuard: CanDeactivateFn<SettingsComponent> = (component) => {
  if (component.hasUnsavedChanges()) {
    return component.showUnsavedDialog();
  }
  return true;
};