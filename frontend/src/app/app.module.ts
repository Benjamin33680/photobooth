import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { routes } from './app.routes';
import { AppComponent } from './app.component';
import { KioskComponent } from './kiosk/kiosk.component';
import { GalleryComponent } from './gallery/gallery.component';
import { LoginComponent } from './auth/login/login.component';
import { AuthInterceptor } from './auth/auth.interceptor';
import { SettingsComponent } from './settings/settings.component';
import { LayoutEditorComponent } from './settings/layout-editor/layout-editor.component';
import { StripPreviewComponent } from './settings/strip-preview/strip-preview.component';
import { RemoteComponent } from './remote/remote.component';
import { MatIconModule } from '@angular/material/icon'
import { AppHeaderComponent } from './shared/app-header/app-header.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { ArchivesComponent } from './archives/archives.component';

@NgModule({
  declarations: [
    AppComponent,
    KioskComponent,
    GalleryComponent,
    LoginComponent,
    SettingsComponent,
    LayoutEditorComponent,
    StripPreviewComponent,
    RemoteComponent,
    AppHeaderComponent,
    ConfirmDialogComponent,
    ArchivesComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    MatIconModule,
    RouterModule.forRoot(routes)
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }