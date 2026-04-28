import { Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { KioskGuard } from './auth/kiosk.guard';
import { KioskComponent } from './kiosk/kiosk.component';
import { GalleryComponent } from './gallery/gallery.component';
import { LoginComponent } from './auth/login.component';
import { AdminGuard } from './auth/admin.guard';
import { SettingsComponent } from './settings/settings.component';
import { RemoteComponent } from './remote/remote.component';

export const routes: Routes = [
  {
    path: '',
    component: KioskComponent,
    canActivate: [KioskGuard],
  },
  {
    path: 'remote',
    component: RemoteComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'gallery',
    component: GalleryComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [AdminGuard],
  },
  { path: '**', redirectTo: '' },
];