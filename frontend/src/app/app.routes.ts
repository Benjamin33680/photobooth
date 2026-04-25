import { Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { KioskGuard } from './auth/kiosk.guard';
import { KioskComponent } from './kiosk/kiosk.component';
import { GalleryComponent } from './gallery/gallery.component';
import { LoginComponent } from './auth/login.component';

export const routes: Routes = [
  {
    path: '',
    component: KioskComponent,
    canActivate: [KioskGuard],
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
  { path: '**', redirectTo: '' },
];